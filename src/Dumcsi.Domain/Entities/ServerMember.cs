using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class ServerMember
{
    public long UserId { get; set; }
    public required User User { get; set; }

    public long ServerId { get; set; }
    public required Server Server { get; set; }

    public Role Role { get; set; } = Role.Member;
    
    public Instant JoinedAt { get; set; }

    // Felhasználó némítja a szervert
    public bool IsMutedForUser { get; set; }

    // Moderátor némítja a felhasználót
    public bool IsSilencedByModerator { get; set; }
    public Instant? SilencedUntil { get; set; }
}