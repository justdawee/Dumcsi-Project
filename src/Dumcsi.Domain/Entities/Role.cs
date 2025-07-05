using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Role
{
    public long Id { get; set; }

    public required string Name { get; set; }
    
    public Permission Permissions { get; set; } = Permission.None;
    
    public string Color { get; set; } = "#ffffff";
    
    public int Position { get; set; }

    // Megjelenjen-e a szerepkör külön a taglistában.
    public bool IsHoisted { get; set; }
    
    // Említhető-e a szerepkör @role formában.
    public bool IsMentionable { get; set; }

    public long ServerId { get; set; }
    public required Server Server { get; set; }
    
    public Instant CreatedAt { get; set; }
    
    public ICollection<ServerMember> Members { get; set; } = new List<ServerMember>();
}