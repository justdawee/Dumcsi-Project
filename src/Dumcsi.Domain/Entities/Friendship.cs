using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Friendship
{
    public long Id { get; set; }

    public long User1Id { get; set; }

    public required User User1 { get; set; }

    public long User2Id { get; set; }

    public required User User2 { get; set; }

    public Instant CreatedAt { get; set; }
}