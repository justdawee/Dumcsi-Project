using System.Collections.Concurrent;
using Dumcsi.Domain.Interfaces;

namespace Dumcsi.Infrastructure.Services;

public class PresenceService : IPresenceService
{
    // A szótár kulcsa a UserId (string), az értéke a hozzá tartozó ConnectionId-k listája.
    private readonly ConcurrentDictionary<string, List<string>> _onlineUsers = new();

    public Task<bool> UserConnected(string userId, string connectionId)
    {
        bool isOnline = false;
        _onlineUsers.AddOrUpdate(userId, 
            // Ha a user még nincs a listában, hozzáadjuk egy új listával
            _ => {
                isOnline = true;
                return new List<string> { connectionId };
            }, 
            // Ha már a listában van (pl. megnyitotta egy új fülön), csak a connectionId-t adjuk hozzá
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
            
            // Ha ez volt az utolsó kapcsolata, akkor offline lesz és töröljük a listából
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
}