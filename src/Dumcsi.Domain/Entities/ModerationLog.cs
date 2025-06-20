using NodaTime;

namespace Dumcsi.Domain.Entities;

public class ModerationLog
{
    public long Id { get; set; }

    public long MessageId { get; set; }
    
    public required Message Message { get; set; }

    public long ModeratorId { get; set; }

    public required User Moderator { get; set; }
    
    public required string Action { get; set; } // Pl. 'HideMessage', 'SilenceUser'
    
    public string? Reason { get; set; }

    public Instant CreatedAt { get; set; }
}