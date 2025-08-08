using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Backend.Models.DTOs;

public class TopicDtos
{
    public class TopicListItemDto
    {
        public long Id { get; set; }
        public long ServerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Position { get; set; }
        public List<ChannelDtos.ChannelListItemDto> Channels { get; set; } = new();
    }

    public class CreateTopicRequestDto
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        [RegularExpression("^[a-z0-9-]{1,100}$")]
        public string Name { get; set; } = string.Empty;
    }

    public class UpdateTopicRequestDto
    {
        [StringLength(100, MinimumLength = 1)]
        [RegularExpression("^[a-z0-9-]{1,100}$")]
        public string? Name { get; set; }
        public int? Position { get; set; }
    }
}
