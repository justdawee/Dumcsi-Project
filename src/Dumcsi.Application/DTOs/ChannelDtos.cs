using System.ComponentModel.DataAnnotations;
using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class ChannelDtos
{
    
    // GET /api/server/{serverId}/channel response
    public class ChannelListItemDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ChannelType Type { get; set; }
        public int Position { get; set; }
        public Instant CreatedAt { get; set; }
    }

    // POST /api/server/{serverId}/channel request
    public class CreateChannelRequestDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ChannelType Type { get; set; } = ChannelType.Text;
    }

    // GET /api/server/{serverId}/channel/{id} response
    public class ChannelDetailDto : ChannelListItemDto
    {
        public List<MessageDtos.MessageListItemDto> Messages { get; set; } = new();
    }
    
    // PUT /api/server/{serverId}/channel/{id} request
    public class UpdateChannelRequestDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public int Position { get; set; } = 0;
    }
}