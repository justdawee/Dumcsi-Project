using NodaTime;

namespace Dumcsi.Domain.Entities;

public class DmMessage
{
    public long Id { get; set; }

    public long SenderId { get; set; }

    public required User Sender { get; set; }

    public long ReceiverId { get; set; }

    public required User Receiver { get; set; }

    public required string Content { get; set; }

    public Instant Timestamp { get; set; }

    public Instant? EditedTimestamp { get; set; }

    public bool IsEdited => EditedTimestamp.HasValue;
}