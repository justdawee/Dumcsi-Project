using Dumcsi.Backend.Models.Enums;
using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class Channel
{
    public long Id { get; set; }
    
    public required string Name { get; set; }
    
    public string? Description { get; set; }
    
    public ChannelType Type { get; set; } = ChannelType.Text;
    
    public int Position { get; set; } = 0;
    
    public long ServerId { get; set; }
    
    public required Server? Server { get; set; }
    
    public long? TopicId { get; set; }

    public Topic? Topic { get; set; }
    
    public Instant CreatedAt { get; set; }
    
    public Instant UpdatedAt { get; set; }
    
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
