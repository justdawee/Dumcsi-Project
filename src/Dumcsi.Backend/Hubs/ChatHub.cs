using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using Dumcsi.Backend.Services.Data;
using Dumcsi.Backend.Data.Context;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Backend.Hubs;

[Authorize]
public class ChatHub(IPresenceService presenceService, IDbContextFactory<DumcsiDbContext> dbContextFactory) : Hub
{
    // Store voice channel users in memory (channel ID -> list of connection IDs)
    // TODO: Use Redis cache for better performance under high load
    private static readonly ConcurrentDictionary<string, List<string>> VoiceChannelUsers = new();
    private static readonly ConcurrentDictionary<string, HashSet<long>> TypingUsers = new();
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> TypingTimers = new();

    // DM typing state: key is sorted pair "min:max" identifying a DM conversation
    private static readonly ConcurrentDictionary<string, HashSet<long>> DmTypingUsers = new();
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> DmTypingTimers = new();

    // Track screen sharing users per channel for server-wide visibility and initial sync
    private static readonly ConcurrentDictionary<string, HashSet<long>> ScreenSharesByChannel = new();

    // Track voice states (mute/deafen) per channel for server-wide visibility and initial sync
    public class VoiceState
    {
        public bool Muted { get; set; }
        public bool Deafened { get; set; }
    }
    private static readonly ConcurrentDictionary<string, Dictionary<long, VoiceState>> VoiceStatesByChannel = new();

    // Map channelId -> serverId to enable server-wide broadcasts for channel-scoped events
    private static readonly ConcurrentDictionary<string, string> ChannelToServer = new();

    // Simple in-memory status map: userId -> status string ("online", "idle", "busy", "invisible")
    private static readonly ConcurrentDictionary<string, string> UserStatuses = new();

    // --- Online/Offline status management ---
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier; // Logged in user ID from token
        if (userId != null)
        {
            // Load persisted preferred status for this user and populate in-memory map if still valid
            try
            {
                await using var db = await dbContextFactory.CreateDbContextAsync();
                if (long.TryParse(userId, out var uidLong))
                {
                    var user = await db.Users.FindAsync(uidLong);
                    if (user != null)
                    {
                        var now = SystemClock.Instance.GetCurrentInstant();
                        var preferred = (user.PreferredStatus ?? string.Empty).Trim().ToLowerInvariant();
                        var expired = user.PreferredStatusExpiresAt.HasValue && user.PreferredStatusExpiresAt.Value <= now;

                        if (!string.IsNullOrEmpty(preferred) && preferred != "online" && !expired)
                        {
                            UserStatuses[userId] = preferred;
                            // Broadcast current status to ensure others have up-to-date state
                            await Clients.All.SendAsync("UserStatusChanged", uidLong, preferred);
                        }
                        else if (expired)
                        {
                            // Clear expired preference
                            user.PreferredStatus = null;
                            user.PreferredStatusExpiresAt = null;
                            await db.SaveChangesAsync();
                            // Ensure in-memory map does not have a stale entry
                            UserStatuses.TryRemove(userId, out _);
                            await Clients.All.SendAsync("UserStatusChanged", uidLong, "online");
                        }
                    }
                }
            }
            catch { /* ignore persistence errors */ }
            var isFirstConnection = await presenceService.UserConnected(userId, Context.ConnectionId);

            // Get all currently online users
            var onlineUsers = await presenceService.GetOnlineUsers();
            var onlineUserIds = onlineUsers.Select(long.Parse).ToList();

            // Send the list of online users to the newly connected client
            await Clients.Caller.SendAsync("Connected", onlineUserIds);

            // Send initial statuses snapshot (best-effort)
            try
            {
                var snapshot = new Dictionary<long, string>();
                foreach (var kv in UserStatuses)
                {
                    if (long.TryParse(kv.Key, out var uid)) snapshot[uid] = kv.Value;
                }
                if (snapshot.Count > 0)
                {
                    await Clients.Caller.SendAsync("UserStatusSnapshot", snapshot);
                }
            }
            catch { /* ignore snapshot errors */ }

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

            // Clean up DM typing indicators on disconnect
            foreach (var kvp in DmTypingUsers)
            {
                if (long.TryParse(userId, out var userIdLong))
                {
                    await RemoveDmTypingUser(kvp.Key, userIdLong);
                }
            }

            // Cancel all DM typing timers for this user
            var dmTimerKeys = DmTypingTimers.Keys.Where(k => k.EndsWith($":{userId}")).ToList();
            foreach (var key in dmTimerKeys)
            {
                if (DmTypingTimers.TryRemove(key, out var timer))
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

                // Clear stored custom status on full disconnect (optional)
                UserStatuses.TryRemove(userId, out _);
                
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

        // Remember which server this channel belongs to (best-effort for broadcasts)
        ChannelToServer[channelId] = serverId;

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

    // --- Explicit user status updates ---
    public Task SetUserStatus(string status)
    {
        // Accept: "online", "idle", "busy", "invisible"
        var normalized = (status ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized != "online" && normalized != "idle" && normalized != "busy" && normalized != "invisible")
        {
            normalized = "online";
        }

        var userId = Context.UserIdentifier;
        if (userId != null)
        {
            UserStatuses[userId] = normalized;
            if (long.TryParse(userId, out var uid))
            {
                // Persist preferred status (forever if not online; clear if online)
                _ = PersistPreferredStatus(uid, normalized, null);
                // Broadcast to everyone for simplicity
                return Clients.All.SendAsync("UserStatusChanged", uid, normalized);
            }
        }
        return Task.CompletedTask;
    }

    // Set a preferred status with a timed expiration (ms)
    public Task SetUserStatusTimed(string status, long durationMs)
    {
        var normalized = (status ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized != "online" && normalized != "idle" && normalized != "busy" && normalized != "invisible")
        {
            normalized = "online";
        }

        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var uid))
        {
            UserStatuses[userId] = normalized;
            Instant? expiresAt = null;
            if (durationMs > 0)
            {
                expiresAt = SystemClock.Instance.GetCurrentInstant().Plus(Duration.FromMilliseconds(durationMs));
            }
            _ = PersistPreferredStatus(uid, normalized, expiresAt);
            return Clients.All.SendAsync("UserStatusChanged", uid, normalized);
        }
        return Task.CompletedTask;
    }

    private async Task PersistPreferredStatus(long userId, string status, Instant? expiresAt)
    {
        try
        {
            await using var db = await dbContextFactory.CreateDbContextAsync();
            var user = await db.Users.FindAsync(userId);
            if (user == null) return;

            if (status == "online")
            {
                user.PreferredStatus = null;
                user.PreferredStatusExpiresAt = null;
            }
            else
            {
                user.PreferredStatus = status;
                user.PreferredStatusExpiresAt = expiresAt;
            }
            await db.SaveChangesAsync();
        }
        catch
        {
            // ignore DB persistence failures
        }
    }

    // --- Direct Message Typing Methods ---

    private static string GetDmKey(long a, long b)
    {
        return a < b ? $"{a}:{b}" : $"{b}:{a}";
    }

    public async Task SendDmTypingIndicator(string otherUserId)
    {
        var selfId = Context.UserIdentifier;
        if (selfId != null && long.TryParse(selfId, out var selfLong) && long.TryParse(otherUserId, out var otherLong))
        {
            var key = GetDmKey(selfLong, otherLong);
            var timerKey = $"{key}:{selfId}";

            if (DmTypingTimers.TryRemove(timerKey, out var existingTimer))
            {
                existingTimer.Cancel();
                existingTimer.Dispose();
            }

            var users = DmTypingUsers.GetOrAdd(key, _ => new HashSet<long>());
            bool wasAdded;
            lock (users)
            {
                wasAdded = users.Add(selfLong);
            }

            if (wasAdded)
            {
                // Notify the other user only
                await Clients.User(otherUserId).SendAsync("DmUserTyping", selfLong);
            }

            var cts = new CancellationTokenSource();
            DmTypingTimers[timerKey] = cts;

            _ = Task.Delay(5000, cts.Token).ContinueWith(async (_) =>
            {
                await RemoveDmTypingUser(key, selfLong);

                var pairToRemove = new KeyValuePair<string, CancellationTokenSource>(timerKey, cts);
                if (((ICollection<KeyValuePair<string, CancellationTokenSource>>)DmTypingTimers).Remove(pairToRemove))
                {
                    cts.Dispose();
                }
            }, TaskContinuationOptions.OnlyOnRanToCompletion);
        }
    }

    public async Task StopDmTypingIndicator(string otherUserId)
    {
        var selfId = Context.UserIdentifier;
        if (selfId != null && long.TryParse(selfId, out var selfLong) && long.TryParse(otherUserId, out var otherLong))
        {
            var key = GetDmKey(selfLong, otherLong);
            var timerKey = $"{key}:{selfId}";
            if (DmTypingTimers.TryRemove(timerKey, out var timer))
            {
                timer.Cancel();
                timer.Dispose();
            }

            await RemoveDmTypingUser(key, selfLong);
        }
    }

    private async Task RemoveDmTypingUser(string key, long userIdLong)
    {
        if (DmTypingUsers.TryGetValue(key, out var users))
        {
            bool wasRemoved;
            long otherUserIdLong = 0;
            lock (users)
            {
                wasRemoved = users.Remove(userIdLong);
                // Determine other participant from key
                var parts = key.Split(':');
                if (parts.Length == 2 && long.TryParse(parts[0], out var a) && long.TryParse(parts[1], out var b))
                {
                    otherUserIdLong = (a == userIdLong) ? b : a;
                }

                if (users.Count == 0)
                {
                    DmTypingUsers.TryRemove(key, out _);
                }
            }

            if (wasRemoved && otherUserIdLong != 0)
            {
                await Clients.User(otherUserIdLong.ToString())
                    .SendAsync("DmUserStoppedTyping", userIdLong);
            }
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

            // Update in-memory state
            if (VoiceStatesByChannel.TryGetValue(channelId, out var vsMap))
            {
                lock (vsMap)
                {
                    vsMap.Remove(long.Parse(userId));
                    if (vsMap.Count == 0)
                    {
                        VoiceStatesByChannel.TryRemove(channelId, out _);
                    }
                }
            }
            if (ScreenSharesByChannel.TryGetValue(channelId, out var shareSet))
            {
                lock (shareSet)
                {
                    shareSet.Remove(long.Parse(userId));
                    if (shareSet.Count == 0)
                    {
                        ScreenSharesByChannel.TryRemove(channelId, out _);
                    }
                }
            }
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

                // Update in-memory state
                if (VoiceStatesByChannel.TryGetValue(channelId, out var vsMap))
                {
                    lock (vsMap)
                    {
                        vsMap.Remove(userIdLong);
                        if (vsMap.Count == 0)
                        {
                            VoiceStatesByChannel.TryRemove(channelId, out _);
                        }
                    }
                }
                if (ScreenSharesByChannel.TryGetValue(channelId, out var shareSet))
                {
                    lock (shareSet)
                    {
                        shareSet.Remove(userIdLong);
                        if (shareSet.Count == 0)
                        {
                            ScreenSharesByChannel.TryRemove(channelId, out _);
                        }
                    }
                }
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
            // Update in-memory state
            var dict = VoiceStatesByChannel.GetOrAdd(channelId, _ => new Dictionary<long, VoiceState>());
            lock (dict)
            {
                dict[userIdLong] = new VoiceState { Muted = muted, Deafened = deafened };
            }

            // Notify users in the voice channel and at server scope (so sidebar can update for everyone)
            await Clients.Group(channelId)
                .SendAsync("UserVoiceStateChanged", long.Parse(channelId), userIdLong, muted, deafened);

            if (ChannelToServer.TryGetValue(channelId, out var serverId))
            {
                await Clients.Group(serverId)
                    .SendAsync("UserVoiceStateChanged", long.Parse(channelId), userIdLong, muted, deafened);
            }
        }
    }

    public async Task SetMuteState(string channelId, bool muted)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            // Update in-memory state
            var dict = VoiceStatesByChannel.GetOrAdd(channelId, _ => new Dictionary<long, VoiceState>());
            lock (dict)
            {
                if (!dict.TryGetValue(userIdLong, out var vs))
                {
                    vs = new VoiceState();
                    dict[userIdLong] = vs;
                }
                vs.Muted = muted;
            }

            // Notify voice channel and server
            await Clients.Group(channelId)
                .SendAsync("UserMuted", long.Parse(channelId), userIdLong, muted);
            if (ChannelToServer.TryGetValue(channelId, out var serverId))
            {
                await Clients.Group(serverId)
                    .SendAsync("UserMuted", long.Parse(channelId), userIdLong, muted);
            }
        }
    }

    public async Task SetDeafenState(string channelId, bool deafened)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            // Update in-memory state
            var dict = VoiceStatesByChannel.GetOrAdd(channelId, _ => new Dictionary<long, VoiceState>());
            lock (dict)
            {
                if (!dict.TryGetValue(userIdLong, out var vs))
                {
                    vs = new VoiceState();
                    dict[userIdLong] = vs;
                }
                vs.Deafened = deafened;
            }

            // Notify voice channel and server
            await Clients.Group(channelId)
                .SendAsync("UserDeafened", long.Parse(channelId), userIdLong, deafened);
            if (ChannelToServer.TryGetValue(channelId, out var serverId))
            {
                await Clients.Group(serverId)
                    .SendAsync("UserDeafened", long.Parse(channelId), userIdLong, deafened);
            }
        }
    }

    // --- Speaking indicators ---
    public async Task StartSpeaking(string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            await Clients.Group(channelId).SendAsync("UserStartedSpeaking", long.Parse(channelId), userIdLong);
        }
    }

    public async Task StopSpeaking(string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null && long.TryParse(userId, out var userIdLong))
        {
            await Clients.Group(channelId).SendAsync("UserStoppedSpeaking", long.Parse(channelId), userIdLong);
        }
    }

    // --- Screen sharing management ---
    public async Task StartScreenShare(string serverId, string channelId)
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
        {
            // Track in-memory state
            var set = ScreenSharesByChannel.GetOrAdd(channelId, _ => new HashSet<long>());
            lock (set) { set.Add(long.Parse(userId)); }

            // Remember channel -> server mapping
            ChannelToServer[channelId] = serverId;

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
            // Update in-memory state
            if (ScreenSharesByChannel.TryGetValue(channelId, out var set))
            {
                lock (set) { set.Remove(long.Parse(userId)); }
                if (set.Count == 0)
                {
                    ScreenSharesByChannel.TryRemove(channelId, out _);
                }
            }

            // Notify ALL users in the server that this user stopped screen sharing
            await Clients.Group(serverId)
                .SendAsync("UserStoppedScreenShare", long.Parse(channelId), long.Parse(userId));
        }
    }

    // Provide initial snapshot of voice-related state for a server (used by sidebar for late joiners)
    public Task<ServerVoiceStatus> GetServerVoiceStatus(string serverId)
    {
        var result = new ServerVoiceStatus();

        // Screen shares
        foreach (var kvp in ScreenSharesByChannel)
        {
            var channelId = kvp.Key;
            if (ChannelToServer.TryGetValue(channelId, out var sid) && sid == serverId)
            {
                lock (kvp.Value)
                {
                    result.ScreenShares[long.Parse(channelId)] = kvp.Value.ToList();
                }
            }
        }

        // Voice states
        foreach (var kvp in VoiceStatesByChannel)
        {
            var channelId = kvp.Key;
            if (ChannelToServer.TryGetValue(channelId, out var sid) && sid == serverId)
            {
                var map = new Dictionary<long, VoiceStateDto>();
                lock (kvp.Value)
                {
                    foreach (var userEntry in kvp.Value)
                    {
                        map[userEntry.Key] = new VoiceStateDto
                        {
                            Muted = userEntry.Value.Muted,
                            Deafened = userEntry.Value.Deafened
                        };
                    }
                }
                result.VoiceStates[long.Parse(channelId)] = map;
            }
        }

        // Voice users present in channels for this server
        foreach (var kvp in VoiceChannelUsers)
        {
            var channelId = kvp.Key;
            if (ChannelToServer.TryGetValue(channelId, out var sid) && sid == serverId)
            {
                var ids = new List<long>();
                var conns = kvp.Value;
                lock (conns)
                {
                    foreach (var cid in conns)
                    {
                        var uidStr = presenceService.GetUserIdByConnectionId(cid).GetAwaiter().GetResult();
                        if (uidStr != null && long.TryParse(uidStr, out var ul))
                        {
                            if (!ids.Contains(ul)) ids.Add(ul);
                        }
                    }
                }
                result.VoiceUsers[long.Parse(channelId)] = ids;
            }
        }

        return Task.FromResult(result);
    }

    public class VoiceStateDto
    {
        public bool Muted { get; set; }
        public bool Deafened { get; set; }
    }

    public class ServerVoiceStatus
    {
        public Dictionary<long, List<long>> ScreenShares { get; set; } = new();
        public Dictionary<long, Dictionary<long, VoiceStateDto>> VoiceStates { get; set; } = new();
        public Dictionary<long, List<long>> VoiceUsers { get; set; } = new();
    }

    // --- Response class ---
    public class ChannelJoinResponse
    {
        public List<long> TypingUserIds { get; set; } = new();
        public List<long> OnlineUserIds { get; set; } = new();
    }
}
