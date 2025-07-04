using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Invite
{
    // A meghívó egyedi kódja, pl. "ABCD123"
    // Ez lesz az elsődleges kulcs.
    public required string Code { get; set; }

    public long ServerId { get; set; }
    public required Server Server { get; set; }

    // Opcionális, melyik csatornára irányít a meghívó.
    public long? ChannelId { get; set; }
    public Channel? Channel { get; set; }

    // A meghívót létrehozó felhasználó.
    public long CreatorId { get; set; }
    public required User Creator { get; set; }

    // Hányszor használható a meghívó? 0 = végtelen.
    public int MaxUses { get; set; } = 0;

    // Hányszor használták eddig.
    public int CurrentUses { get; set; } = 0;

    // Lejárati idő. Ha null, soha nem jár le.
    public Instant? ExpiresAt { get; set; }
    
    // Ideiglenes tagságot ad-e? (Ha a user kilép, elveszíti a tagságot)
    public bool IsTemporary { get; set; } = false;

    public Instant CreatedAt { get; set; }
}