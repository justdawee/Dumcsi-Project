using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class BlockedUser
{
    public long Id { get; set; }
    public long BlockerId { get; set; }
    public required User Blocker { get; set; }

    public long BlockedId { get; set; }
    public required User Blocked { get; set; }

    public Instant CreatedAt { get; set; }
}

