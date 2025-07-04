using NodaTime;

namespace Dumcsi.Domain.Entities;

public class User
{
    public long Id { get; set; }
    
    public required string Username { get; set; }
    public required string Email { get; set; }
    public required byte[] PasswordHash { get; set; }
    
    public string? ProfilePictureUrl { get; set; }
    public required Instant CreatedAt { get; set; }
    
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();
    
    public ICollection<Server> OwnedServers { get; set; } = new List<Server>();
    public ICollection<ServerMember> ServerMemberships { get; set; } = new List<ServerMember>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<ModerationLog> ModerationActions { get; set; } = new List<ModerationLog>();
}