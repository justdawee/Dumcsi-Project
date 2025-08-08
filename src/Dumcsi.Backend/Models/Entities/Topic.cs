using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class Topic
{
    public long Id { get; set; }
    public required string Name { get; set; }
    public int Position { get; set; } = 0;

    public long ServerId { get; set; }
    public required Server? Server { get; set; }

    public Instant CreatedAt { get; set; }
    public Instant UpdatedAt { get; set; }

    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
}
