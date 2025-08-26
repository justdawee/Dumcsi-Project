using System.ComponentModel.DataAnnotations;
using NodaTime;

namespace Dumcsi.Backend.Models.DTOs;

public class DmMessageDtos
{
    public class DmMessageDto
    {
        public long Id { get; set; }
        public long SenderId { get; set; }
        public long ReceiverId { get; set; }
        public UserDtos.UserProfileDto Sender { get; set; } = null!;
        public string Content { get; set; } = string.Empty;
        public Instant Timestamp { get; set; }
        public Instant? EditedTimestamp { get; set; }
        public bool Tts { get; set; }
        public List<UserDtos.UserProfileDto> Mentions { get; set; } = [];
        public List<MessageDtos.AttachmentDto> Attachments { get; set; } = [];
    }

    public class SendDmMessageRequest
    {
        [StringLength(4000)]
        public string Content { get; set; } = string.Empty;
        public bool Tts { get; set; } = false;
        public List<long>? AttachmentIds { get; set; }
        public List<long>? MentionedUserIds { get; set; }
    }

    public class UpdateDmMessageRequest
    {
        [Required]
        [StringLength(4000, ErrorMessage = "Content cannot exceed 4000 characters.")]
        public string Content { get; set; } = string.Empty;
    }

    public class ConversationListItemDto
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? LastMessage { get; set; }
        public Instant? LastTimestamp { get; set; }
    }
}
