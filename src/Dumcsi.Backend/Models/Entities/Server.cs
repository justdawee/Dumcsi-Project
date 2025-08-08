using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class Server
{
    public long Id { get; set; }
    
    public required string Name { get; set; }
    
    public string? Description { get; set; }
    
    public string? Icon { get; set; }
    
    public long OwnerId { get; set; }
    
    public required User Owner { get; set; }
    
    public Instant CreatedAt { get; set; }
    
    public Instant UpdatedAt { get; set; }
    
    public bool Public { get; set; }
    
    public int? MemberLimit { get; set; }
    
    public ICollection<ServerMember> Members { get; set; } = new List<ServerMember>();
    
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
    
    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    
    public ICollection<Role> Roles { get; set; } = new List<Role>();
}
