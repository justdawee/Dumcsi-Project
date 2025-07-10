using System.ComponentModel.DataAnnotations;
using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class ChannelDtos
{
    public class ChannelListItemDto
    {
        public long Id { get; set; }
        public long ServerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public ChannelType Type { get; set; }
        public int Position { get; set; }
    }

    public class CreateChannelRequestDto
    {
        [Required]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Channel name must be between 1 and 100 characters.")]
        [RegularExpression("^[a-z0-9-]{1,100}$", ErrorMessage = "Channel name can only contain lowercase letters, numbers, and hyphens.")]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(1024)]
        public string? Description { get; set; }
        public ChannelType Type { get; set; } = ChannelType.Text;
    }

    public class ChannelDetailDto : ChannelListItemDto
    {
        public string? Description { get; set; }
        public Instant CreatedAt { get; set; }
    }
    
    public class UpdateChannelRequestDto
    {
        [StringLength(100, MinimumLength = 1)]
        [RegularExpression("^[a-z0-9-]{1,100}$")]
        public string? Name { get; set; }

        [StringLength(1024)]
        public string? Description { get; set; }
        public int? Position { get; set; }
    }
}