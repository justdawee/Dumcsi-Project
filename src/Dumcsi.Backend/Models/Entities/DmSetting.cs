using Dumcsi.Backend.Models.Enums;

namespace Dumcsi.Backend.Models.Entities;

public class DmSetting
{
    public long UserId { get; set; }

    public required User User { get; set; }

    public DmFilterOption FilterOption { get; set; } = DmFilterOption.AllowAll;
}
