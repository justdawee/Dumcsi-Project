using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class FriendRequest
{
    public long Id { get; set; }

    public long FromUserId { get; set; }

    public required User FromUser { get; set; }

    public long ToUserId { get; set; }

    public required User ToUser { get; set; }

    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;

    public Instant CreatedAt { get; set; }

    public Instant? RespondedAt { get; set; }
}