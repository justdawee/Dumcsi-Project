using Dumcsi.Domain.Enums;

namespace Dumcsi.Domain.Entities;

public class DmSetting
{
    public long UserId { get; set; }

    public required User User { get; set; }

    public DmFilterOption FilterOption { get; set; } = DmFilterOption.AllowAll;
}