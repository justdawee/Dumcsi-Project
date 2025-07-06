namespace Dumcsi.Domain.Interfaces;

public interface IPresenceService
{
    Task<bool> UserConnected(string userId, string connectionId);
    Task<bool> UserDisconnected(string userId, string connectionId);
    Task<string[]> GetOnlineUsers();
}