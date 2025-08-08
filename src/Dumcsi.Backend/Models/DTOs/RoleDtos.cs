using System.ComponentModel.DataAnnotations;
using Dumcsi.Backend.Models.Enums;

namespace Dumcsi.Backend.Models.DTOs;

public class RoleDtos
{
    // POST /api/server/{serverId}/roles
    public class CreateRoleRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string Color { get; set; } = "#ffffff";

        public Permission Permissions { get; set; } = Permission.None;

        public bool IsHoisted { get; set; } = false;
        
        public bool IsMentionable { get; set; } = false;
    }

    // PATCH /api/server/{serverId}/roles/{roleId}
    public class UpdateRoleRequestDto
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        public string? Color { get; set; }

        public Permission? Permissions { get; set; }
        
        public int? Position { get; set; }

        public bool? IsHoisted { get; set; }
        
        public bool? IsMentionable { get; set; }
    }
    
    // PUT /api/server/{serverId}/members/{memberId}/roles
    public class UpdateMemberRolesRequestDto
    {
        [Required]
        public List<long> RoleIds { get; set; } = new();
    }
}
