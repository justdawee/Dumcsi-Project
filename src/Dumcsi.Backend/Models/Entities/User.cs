using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class User
{
    public long Id { get; set; }
    
    public required string Username { get; set; }
    
    public string? GlobalNickname { get; set; }
    
    public required string Email { get; set; }
    
    public required byte[] PasswordHash { get; set; }
    
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();
    
    public required Instant CreatedAt { get; set; }
    
    public string? Avatar { get; set; }
    
    public string? Locale { get; set; }
    
    public bool? Verified { get; set; }
}
