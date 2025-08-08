using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class Invite
{
    public required string Code { get; set; }

    public long ServerId { get; set; }
    
    public required Server Server { get; set; }
    
    public long? ChannelId { get; set; }
    
    public Channel? Channel { get; set; }
    
    public long CreatorId { get; set; }
    public required User Creator { get; set; }
    
    public int MaxUses { get; set; } = 0;
    
    public int CurrentUses { get; set; } = 0;
    
    public Instant? ExpiresAt { get; set; }
    
    public bool IsTemporary { get; set; } = false;

    public Instant CreatedAt { get; set; }
}
