using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class ServerMember
{
    public long UserId { get; set; }
    
    public required User User { get; set; }
    
    public string ServerNickname { get; set; } = string.Empty;
    
    public long ServerId { get; set; }
    
    public required Server Server { get; set; }
    
    public Instant JoinedAt { get; set; }
    
    public bool Deafened { get; set; }
    
    public bool Muted { get; set; }
    
    public Instant MutedUntil { get; set; }
    
    public ICollection<Role> Roles { get; set; } = new List<Role>();
}
