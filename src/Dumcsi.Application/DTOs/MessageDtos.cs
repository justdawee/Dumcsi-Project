using System.ComponentModel.DataAnnotations;
using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class MessageDtos
{
    public class MessageDto
    {
        public long Id { get; set; }
        public long ChannelId { get; set; }
        public long UserId { get; set; }
        public string Content { get; set; } = string.Empty;
        public Instant CreatedAt { get; set; }
        public Instant? EditedAt { get; set; }
        public bool IsEdited => EditedAt.HasValue;
    }

    public class CreateMessageRequestDto
    {
        [Required]
        public string Content { get; set; } = string.Empty;
    }
    
    public class UpdateMessageRequestDto
    {
        [Required]
        public string Content { get; set; } = string.Empty;
    }
    
    public class MessageListItemDto
    {
        public long Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public long SenderId { get; set; }
        public string SenderUsername { get; set; } = string.Empty;
        public ModerationStatus ModerationStatus { get; set; }
        public Instant CreatedAt { get; set; }
        public Instant? EditedAt { get; set; }
        public bool IsEdited => EditedAt.HasValue;
    }
    
    public class MessageDetailDto
    {
        public long Id { get; set; }
        public long ChannelId { get; set; }
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public Instant CreatedAt { get; set; }
        public Instant? EditedAt { get; set; }
        public bool IsEdited => EditedAt.HasValue;
    }
}