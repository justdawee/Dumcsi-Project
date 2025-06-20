using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class RoomParticipant
{
    public long UserId { get; set; }
    
    public required User User { get; set; }

    public long RoomId { get; set; }
    
    public required ChatRoom ChatRoom { get; set; }

    public Role Role { get; set; } = Role.Member;
    
    public Instant JoinedAt { get; set; }

    // A felhasználó némítja le a szobát
    public bool IsMutedForUser { get; set; } = false;

    // A moderátor némítja le a felhasználót
    public bool IsSilencedByModerator { get; set; } = false;
    
    public Instant? SilencedUntil { get; set; }
}