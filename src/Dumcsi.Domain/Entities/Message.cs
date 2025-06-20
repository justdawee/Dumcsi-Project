using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Message
{
    public long Id { get; set; }

    public long RoomId { get; set; }
    
    public required ChatRoom ChatRoom { get; set; }

    public long SenderId { get; set; }
    
    public required User Sender { get; set; }
    
    public required string Content { get; set; }

    public ModerationStatus ModerationStatus { get; set; } = ModerationStatus.Visible;
    
    public Instant CreatedAt { get; set; }
    
    public Instant UpdatedAt { get; set; }
    
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    
    public ICollection<ModerationLog> ModerationLogs { get; set; } = new List<ModerationLog>();
}