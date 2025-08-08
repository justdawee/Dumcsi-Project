using System.ComponentModel.DataAnnotations;
using Dumcsi.Backend.Models.Enums;
using NodaTime;

namespace Dumcsi.Backend.Models.DTOs;

public class MessageDtos
{
    public class MessageDto
    {
        public long Id { get; set; }
        public long ChannelId { get; set; }
        public UserDtos.UserProfileDto Author { get; set; } = null!;
        public string Content { get; set; } = string.Empty;
        public Instant Timestamp { get; set; }
        public Instant? EditedTimestamp { get; set; }
        public bool Tts { get; set; }
        public List<UserDtos.UserProfileDto> Mentions { get; set; } = [];
        public List<long> MentionRoleIds { get; set; } = [];
        public List<AttachmentDto> Attachments { get; set; } = [];
        public List<ReactionDto> Reactions { get; set; } = [];
    }

    public class CreateMessageRequestDto
    {
        [StringLength(4000)]
        public string Content { get; set; } = string.Empty;
        public bool Tts { get; set; } = false;
        public List<long>? AttachmentIds { get; set; }
        public List<long>? MentionedUserIds { get; set; }
        public List<long>? MentionedRoleIds { get; set; }
    }
    
    public class UpdateMessageRequestDto
    {
        [Required]
        [StringLength(4000, ErrorMessage = "Content cannot exceed 4000 characters.")]
        public string Content { get; set; } = string.Empty;
    }
    
    public class ReactionDto
    {
        public string EmojiId { get; set; } = string.Empty;
        public int Count { get; set; }
        public bool Me { get; set; }
    }
    
    public class AttachmentDto
    {
        public long Id { get; set; }
        public required string FileName { get; set; }
        public required string FileUrl { get; set; }
        public int FileSize { get; set; }
        public string? ContentType { get; set; }
        public int? Height { get; set; }
        public int? Width { get; set; }
        public float? Duration { get; set; }
        public string? Waveform { get; set; }
    }
}
