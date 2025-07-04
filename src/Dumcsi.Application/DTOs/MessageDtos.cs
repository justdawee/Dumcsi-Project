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
        public string Username { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public Instant CreatedAt { get; set; }
        public Instant? EditedAt { get; set; }
        public bool IsEdited => EditedAt.HasValue;
    }

    public class CreateMessageRequestDto
    {
        [Required]
        [StringLength(2000, ErrorMessage = "Content cannot exceed 2000 characters.")]
        public string Content { get; set; } = string.Empty;
    }
    
    public class UpdateMessageRequestDto
    {
        [Required]
        [StringLength(2000, ErrorMessage = "Content cannot exceed 2000 characters.")]
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
        public List<ReactionDto> Reactions { get; set; } = [];
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
    
    public class ReactionDto
    {
        public string EmojiId { get; set; } = string.Empty;
        public int Count { get; set; }
        public bool Me { get; set; } // A jelenlegi felhasználó reagált-e ezzel
    }
}