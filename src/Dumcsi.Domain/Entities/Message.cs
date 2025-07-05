using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Message
{
    public long Id { get; set; }

    public long ChannelId { get; set; }

    public required Channel Channel { get; set; }

    public required User? Author { get; set; }

    public long SenderId { get; set; }

    public required string Content { get; set; }

    public Instant Timestamp { get; set; }

    public Instant? EditedTimestamp { get; set; }

    public bool? Tts { get; set; }

    public ICollection<User> MentionUsers { get; set; } = new List<User>();

    public ICollection<Role> MentionRoles { get; set; } = new List<Role>();
    
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}