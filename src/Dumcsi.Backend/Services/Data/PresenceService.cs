using System.Collections.Concurrent;
using Dumcsi.Backend.Services.Data;

namespace Dumcsi.Backend.Services.Data;

public class PresenceService : IPresenceService
{
    private readonly ConcurrentDictionary<string, List<string>> _onlineUsers = new();

    public Task<bool> UserConnected(string userId, string connectionId)
    {
        bool isOnline = false;
        _onlineUsers.AddOrUpdate(userId, 
            _ => {
                isOnline = true;
                return new List<string> { connectionId };
            }, 
            (_, connections) => {
                lock (connections)
                {
                    connections.Add(connectionId);
                }
                return connections;
            });
            
        return Task.FromResult(isOnline);
    }

    public Task<bool> UserDisconnected(string userId, string connectionId)
    {
        bool isOffline = false;
        if (_onlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
            }
            
            if (connections.Count == 0)
            {
                isOffline = true;
                _onlineUsers.TryRemove(userId, out _);
            }
        }
        
        return Task.FromResult(isOffline);
    }

    public Task<string[]> GetOnlineUsers()
    {
        return Task.FromResult(_onlineUsers.Keys.ToArray());
    }
    
    public Task<string?> GetUserIdByConnectionId(string connectionId)
    {
        foreach (var kvp in _onlineUsers)
        {
            if (kvp.Value.Contains(connectionId))
            {
                return Task.FromResult<string?>(kvp.Key);
            }
        }

        return Task.FromResult<string?>(null);
    }
}
