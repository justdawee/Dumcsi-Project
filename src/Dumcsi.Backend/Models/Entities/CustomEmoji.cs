using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class CustomEmoji
{
    public long Id { get; set; }
    
    public required string Name { get; set; }
    
    public required string ImageUrl { get; set; }
    
    public long ServerId { get; set; }
    
    public required Server Server { get; set; }
    
    public long CreatorId { get; set; }
    
    public required User Creator { get; set; }
    
    public Instant CreatedAt { get; set; }
}
