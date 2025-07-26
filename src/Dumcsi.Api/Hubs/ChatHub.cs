using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using Dumcsi.Domain.Interfaces;

namespace Dumcsi.Api.Hubs;

[Authorize]
public class ChatHub(IPresenceService presenceService) : Hub
{
    // Memóriában tároljuk, hogy melyik csatornában (string) kik vannak (ConnectionId lista)
    // TODO: Redis cache használata a jobb teljesítmény érdekében, ha nagyobb terhelés várható
    private static readonly ConcurrentDictionary<string, List<string>> VoiceChannelUsers = new();
    private static readonly ConcurrentDictionary<string, HashSet<long>> TypingUsers = new();
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> TypingTimers = new();

    // --- Online/Offline állapotok kezelése ---
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier; // Bejelentkezett user ID-ja a tokenből
        if (userId != null)
        {
            var isFirstConnection = await presenceService.UserConnected(userId, Context.ConnectionId);

            // Get all currently online users
            var onlineUsers = await presenceService.GetOnlineUsers();
            var onlineUserIds = onlineUsers.Select(long.Parse).ToList();
        
            // Send the list of online users to the newly connected client
            await Clients.Caller.SendAsync("Connected", onlineUserIds);

            // Csak akkor küldünk értesítést, ha ez volt a felhasználó első aktív kapcsolata
            if (isFirstConnection)
            {
                // Értesítjük az összes többi klienst, hogy ez a user online lett
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

            // Handle offline status
            var wentOffline = await presenceService.UserDisconnected(userId, Context.ConnectionId);
            if (wentOffline)
            {
                await Clients.Others.SendAsync("UserOffline", long.Parse(userId));
            }
        }
        
        await base.OnDisconnectedAsync(exception);
    }
    
    // --- Server Csoportok ---
    public async Task JoinServer(string serverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, serverId);
    }

    public async Task LeaveServer(string serverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, serverId);
    }
    
    // --- Text Chat Metódusok ---
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
                await Clients.OthersInGroup(channelId).SendAsync("UserStoppedTyping", long.Parse(channelId), userIdLong);
            }
        }
    }
    
    // --- Voice Chat Metódusok ---

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
                if (cid == connectionId) continue; // Ne küldjük vissza saját connectionId-nkat

                var uid = await presenceService.GetUserIdByConnectionId(cid);
                if (uid != null && long.TryParse(uid, out var parsed))
                {
                    existingUsers.Add(new { userId = parsed, connectionId = cid });
                }
            }

            await Clients.Client(connectionId).SendAsync("AllUsersInVoiceChannel", channelId, existingUsers);
            await Clients.OthersInGroup(serverId).SendAsync("UserJoinedVoiceChannel", channelId, long.Parse(userId), connectionId);
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
            await Clients.Group(serverId).SendAsync("UserLeftVoiceChannel", channelId, long.Parse(userId), Context.ConnectionId);
        }
    }

    // --- WebRTC kapcsolatok kezelése ---
    public async Task SendOffer(string targetConnectionId, object offer)
    {
        // Az offer-t továbbítjuk a cél kliensnek, mellékelve a küldő ConnectionId-ját
        await Clients.Client(targetConnectionId).SendAsync("ReceiveOffer", Context.ConnectionId, offer);
    }

    public async Task SendAnswer(string targetConnectionId, object answer)
    {
        // A választ továbbítjuk az eredeti ajánlatot küldő kliensnek
        await Clients.Client(targetConnectionId).SendAsync("ReceiveAnswer", Context.ConnectionId, answer);
    }

    public async Task SendIceCandidate(string targetConnectionId, object iceCandidate)
    {
        // Az ICE candidate-et továbbítjuk a másik kliensnek
        await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, iceCandidate);
    }
    
    // --- Képernyőmegosztás kezelése ---
    public async Task StartScreenShare(string channelId)
    {
        // Értesítjük a csatorna csoportjában lévő többi felhasználót,
        // hogy ez a connectionId (Context.ConnectionId) megosztja a képernyőjét.
        // A kliensek ezután tudnak majd kapcsolódási ajánlatot (offer) küldeni neki.
        await Clients.OthersInGroup(channelId).SendAsync("UserStartedScreenShare", Context.ConnectionId);
    }
    
    public async Task StopScreenShare(string channelId)
    {
        // Értesítjük a többieket, hogy a képernyőmegosztás véget ért,
        // így lebonthatják a kapcsolódó P2P kapcsolatot.
        await Clients.OthersInGroup(channelId).SendAsync("UserStoppedScreenShare", Context.ConnectionId);
    }
    
    // --- Response class ---
    public class ChannelJoinResponse
    {
        public List<long> TypingUserIds { get; set; } = new();
        public List<long> OnlineUserIds { get; set; } = new();
    }
}
