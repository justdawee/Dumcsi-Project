namespace Dumcsi.Backend.Services.Data;

public interface IPresenceService
{
    Task<bool> UserConnected(string userId, string connectionId);
    Task<bool> UserDisconnected(string userId, string connectionId);
    Task<string[]> GetOnlineUsers();
    Task<string?> GetUserIdByConnectionId(string connectionId);
    Task HandleTemporaryMemberOffline(long userId);
}
