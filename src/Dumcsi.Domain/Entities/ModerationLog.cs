using NodaTime;

namespace Dumcsi.Domain.Entities;

public class ModerationLog
{
    public long Id { get; set; }

    public long? MessageId { get; set; }
    public Message? Message { get; set; }

    public long? ServerId { get; set; }
    public Server? Server { get; set; }

    public long ModeratorId { get; set; }
    public required User Moderator { get; set; }
    
    public required string Action { get; set; }
    public string? Reason { get; set; }

    public Instant CreatedAt { get; set; }
}