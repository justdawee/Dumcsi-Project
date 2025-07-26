using System.ComponentModel.DataAnnotations;
using NodaTime;

namespace Dumcsi.Application.DTOs;

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
    }

    public class SendDmMessageRequest
    {
        [Required]
        [StringLength(4000)]
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