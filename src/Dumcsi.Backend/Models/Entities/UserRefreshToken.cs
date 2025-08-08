using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class UserRefreshToken
{
    public long Id { get; set; }
    
    public long UserId { get; set; }
    
    public string? Token { get; set; }
    
    public required Instant ExpiresAt { get; set; }
    
    public required User User { get; set; }
    
    public required Instant CreatedAt { get; set; }
}
