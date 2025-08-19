using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using Dumcsi.Backend.Services.Data;

namespace Dumcsi.Backend.Hubs;

[Authorize]
public class ChatHub(IPresenceService presenceService) : Hub
{
    // Store voice channel users in memory (channel ID -> list of connection IDs)
    // TODO: Use Redis cache for better performance under high load
    private static readonly ConcurrentDictionary<string, List<string>> VoiceChannelUsers = new();
    private static readonly ConcurrentDictionary<string, HashSet<long>> TypingUsers = new();
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> TypingTimers = new();

    // --- Online/Offline status management ---
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier; // Logged in user ID from token
        if (userId != null)
        {
            var isFirstConnection = await presenceService.UserConnected(userId, Context.ConnectionId);

            // Get all currently online users
            var onlineUsers = await presenceService.GetOnlineUsers();
            var onlineUserIds = onlineUsers.Select(long.Parse).ToList();

            // Send the list of online users to the newly connected client
            await Clients.Caller.SendAsync("Connected", onlineUserIds);

            // Only send notification if this was the user's first active connection
            if (isFirstConnection)
            {
                // Notify all other clients that this user came online
                await Clients.Others.SendAsync("UserOnline", long.Parse(userId));
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
        {
            // Clean up typing indicators on disconnect
            foreach (var kvp in TypingUsers)
            {
                if (long.TryParse(userId, out var userIdLong))
                {
                    await RemoveTypingUser(kvp.Key, userIdLong);
                }
            }

            // Cancel all typing timers for this user
            var userTimerKeys = TypingTimers.Keys.Where(k => k.EndsWith($":{userId}")).ToList();
            foreach (var key in userTimerKeys)
            {
                if (TypingTimers.TryRemove(key, out var timer))
                {
                    timer.Cancel();
                    timer.Dispose();
                }
            }

            // Clean up voice channel connections on disconnect
            await CleanupVoiceChannelConnection(Context.ConnectionId, userId);

            // Handle offline status
            var wentOffline = await presenceService.UserDisconnected(userId, Context.ConnectionId);
            if (wentOffline)
            {
                await Clients.Others.SendAsync("UserOffline", long.Parse(userId));
                
                // Handle temporary member kick logic
                if (long.TryParse(userId, out var userIdLong))
                {
                    await presenceService.HandleTemporaryMemberOffline(userIdLong);
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // --- Server Groups ---
    public async Task JoinServer(string serverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, serverId);
    }

    public async Task LeaveServer(string serverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, serverId);
    }

    // --- Text Chat Methods ---
    public async Task<ChannelJoinResponse> JoinChannel(string channelId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, channelId);

        var response = new ChannelJoinResponse();

        // Get typing users
        if (TypingUsers.TryGetValue(channelId, out var users))
        {
            lock (users)
            {
                response.TypingUserIds = users.ToList();
            }
        }
        else
        {
            response.TypingUserIds = new List<long>();
        }

        // Get online users in this channel
        // First, get all channel members (you'll need to inject the appropriate service)
        // For now, we'll return all online users - you should filter by channel members
        var onlineUsers = await presenceService.GetOnlineUsers();
        response.OnlineUserIds = onlineUsers.Select(long.Parse).ToList();

        return response;
    }

    public async Task LeaveChannel(string channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channelId);

        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            if (TypingUsers.TryGetValue(channelId, out var users))
            {
                lock (users)
                {
                    if (users.Remove(userIdLong) && users.Count == 0)
                    {
                        TypingUsers.TryRemove(channelId, out _);
                    }
                }
            }
        }
    }

    public async Task SendTypingIndicator(string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            var timerKey = $"{channelId}:{userId}";

            if (TypingTimers.TryRemove(timerKey, out var existingTimer))
            {
                existingTimer.Cancel();
                existingTimer.Dispose();
            }

            var users = TypingUsers.GetOrAdd(channelId, _ => new HashSet<long>());
            bool wasAdded;
            lock (users)
            {
                wasAdded = users.Add(userIdLong);
            }

            if (wasAdded)
            {
                await Clients.OthersInGroup(channelId).SendAsync("UserTyping", long.Parse(channelId), userIdLong);
            }

            var cts = new CancellationTokenSource();
            TypingTimers[timerKey] = cts;

            _ = Task.Delay(5000, cts.Token).ContinueWith(async (_) =>
            {
                await RemoveTypingUser(channelId, userIdLong);

                var pairToRemove = new KeyValuePair<string, CancellationTokenSource>(timerKey, cts);
                if (((ICollection<KeyValuePair<string, CancellationTokenSource>>)TypingTimers).Remove(pairToRemove))
                {
                    cts.Dispose();
                }
            }, TaskContinuationOptions.OnlyOnRanToCompletion);
        }
    }

    public async Task StopTypingIndicator(string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            // Cancel timer
            var timerKey = $"{channelId}:{userId}";
            if (TypingTimers.TryRemove(timerKey, out var timer))
            {
                timer.Cancel();
                timer.Dispose();
            }

            await RemoveTypingUser(channelId, userIdLong);
        }
    }

    private async Task RemoveTypingUser(string channelId, long userIdLong)
    {
        if (TypingUsers.TryGetValue(channelId, out var users))
        {
            bool wasRemoved;
            lock (users)
            {
                wasRemoved = users.Remove(userIdLong);
                if (users.Count == 0)
                {
                    TypingUsers.TryRemove(channelId, out _);
                }
            }

            if (wasRemoved)
            {
                await Clients.OthersInGroup(channelId)
                    .SendAsync("UserStoppedTyping", long.Parse(channelId), userIdLong);
            }
        }
    }

    // --- Voice Chat Methods ---

    public async Task JoinVoiceChannel(string serverId, string channelId)
    {
        var connectionId = Context.ConnectionId;
        var userId = Context.UserIdentifier;

        await Groups.AddToGroupAsync(connectionId, channelId);

        List<string> connections = VoiceChannelUsers.GetOrAdd(channelId, _ => new List<string>());
        lock (connections)
        {
            connections.Add(connectionId);
        }

        if (userId != null)
        {
            var existingUsers = new List<object>();
            foreach (var cid in connections)
            {
                // Include ALL users in voice channel, including self
                var uid = await presenceService.GetUserIdByConnectionId(cid);
                if (uid != null && long.TryParse(uid, out var parsed))
                {
                    existingUsers.Add(new { userId = parsed, connectionId = cid });
                }
            }

            // Send current voice channel users to the joining user (including themselves)
            await Clients.Client(connectionId).SendAsync("AllUsersInVoiceChannel", channelId, existingUsers);
            
            // Notify ALL users in the server about the new voice channel user
            await Clients.Group(serverId)
                .SendAsync("UserJoinedVoiceChannel", channelId, long.Parse(userId), connectionId);
        }
    }

    public async Task LeaveVoiceChannel(string serverId, string channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channelId);

        if (VoiceChannelUsers.TryGetValue(channelId, out var users))
        {
            lock (users)
            {
                users.Remove(Context.ConnectionId);
                if (users.Count == 0)
                {
                    VoiceChannelUsers.TryRemove(channelId, out _);
                }
            }
        }

        var userId = Context.UserIdentifier;
        if (userId != null)
        {
            await Clients.Group(serverId)
                .SendAsync("UserLeftVoiceChannel", channelId, long.Parse(userId), Context.ConnectionId);

            // Ensure screen share is considered stopped when leaving the voice channel
            await Clients.Group(serverId)
                .SendAsync("UserStoppedScreenShare", long.Parse(channelId), long.Parse(userId));
        }
    }

    private async Task CleanupVoiceChannelConnection(string connectionId, string userId)
    {
        // Find all voice channels this connection was in and remove it
        var channelsToCleanup = new List<string>();

        foreach (var kvp in VoiceChannelUsers)
        {
            var channelId = kvp.Key;
            var connections = kvp.Value;

            bool wasInChannel = false;
            lock (connections)
            {
                wasInChannel = connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    channelsToCleanup.Add(channelId);
                }
            }

            // If the user was in this voice channel, notify others
            if (wasInChannel && userId != null && long.TryParse(userId, out var userIdLong))
            {
                // We need to find the server ID to notify properly
                // For now, we'll send to all groups - this isn't perfect but works
                await Clients.All.SendAsync("UserLeftVoiceChannel", channelId, userIdLong, connectionId);

                // Also signal that any active screen share by this user should stop
                await Clients.All.SendAsync("UserStoppedScreenShare", long.Parse(channelId), userIdLong);
            }
        }

        // Remove empty voice channel collections
        foreach (var channelId in channelsToCleanup)
        {
            VoiceChannelUsers.TryRemove(channelId, out _);
        }
    }

    // --- WebRTC connection management ---
    public async Task SendOffer(string targetConnectionId, object offer)
    {
        // Forward the offer to target client, including sender's connection ID
        await Clients.Client(targetConnectionId).SendAsync("ReceiveOffer", Context.ConnectionId, offer);
    }

    public async Task SendAnswer(string targetConnectionId, object answer)
    {
        // Forward the answer to the original offer sender
        await Clients.Client(targetConnectionId).SendAsync("ReceiveAnswer", Context.ConnectionId, answer);
    }

    public async Task SendIceCandidate(string targetConnectionId, object iceCandidate)
    {
        // Forward the ICE candidate to the other client
        await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, iceCandidate);
    }

    // --- Voice state management ---
    public async Task UpdateVoiceState(string channelId, bool muted, bool deafened)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            // Notify all users in the voice channel about the voice state change
            await Clients.Group(channelId)
                .SendAsync("UserVoiceStateChanged", long.Parse(channelId), userIdLong, muted, deafened);
        }
    }

    public async Task SetMuteState(string channelId, bool muted)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            // Notify all users in the voice channel about the mute state change
            await Clients.Group(channelId)
                .SendAsync("UserMuted", long.Parse(channelId), userIdLong, muted);
        }
    }

    public async Task SetDeafenState(string channelId, bool deafened)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            // Notify all users in the voice channel about the deafen state change
            await Clients.Group(channelId)
                .SendAsync("UserDeafened", long.Parse(channelId), userIdLong, deafened);
        }
    }

    // --- Screen sharing management ---
    public async Task StartScreenShare(string serverId, string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
        {
            // Notify ALL users in the server that this user started screen sharing
            // This ensures everyone gets the signal, not just those in the voice channel
            await Clients.Group(serverId)
                .SendAsync("UserStartedScreenShare", long.Parse(channelId), long.Parse(userId));
        }
    }

    public async Task StopScreenShare(string serverId, string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
        {
            // Notify ALL users in the server that this user stopped screen sharing
            await Clients.Group(serverId)
                .SendAsync("UserStoppedScreenShare", long.Parse(channelId), long.Parse(userId));
        }
    }

    // --- Response class ---
    public class ChannelJoinResponse
    {
        public List<long> TypingUserIds { get; set; } = new();
        public List<long> OnlineUserIds { get; set; } = new();
    }
}
