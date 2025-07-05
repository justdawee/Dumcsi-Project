using NodaTime;

namespace Dumcsi.Domain.Entities;

public class CustomEmoji
{
    public long Id { get; set; }
    
    public required string Name { get; set; }
    
    public required string ImageUrl { get; set; } // URL vagy fájlnév, jövőben lehet saját fájltárolás is
    
    public long ServerId { get; set; }
    
    public required Server Server { get; set; }
    
    public long CreatorId { get; set; }
    
    public required User Creator { get; set; }
    
    public Instant CreatedAt { get; set; }
}