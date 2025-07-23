using System.ComponentModel.DataAnnotations;
using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class ServerDtos
{
    public class ServerListItemDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Icon { get; set; }
        public int MemberCount { get; set; }
        public long OwnerId { get; set; }
        public bool IsOwner { get; set; }
        public bool Public { get; set; }
        public Instant CreatedAt { get; set; }
    }
    
    public class CreateServerRequestDto
    {
        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Name { get; set; } = string.Empty;
        [MaxLength(500)]
        public string? Description { get; set; }
        public bool Public { get; set; } = false;
    }
    
    public class ServerDetailDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Icon { get; set; }
        public long OwnerId { get; set; }
        public string OwnerUsername { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public bool IsOwner { get; set; }
        public bool Public { get; set; }
        public Permission CurrentUserPermissions { get; set; }
        public Instant CreatedAt { get; set; }
        public List<ChannelDtos.ChannelListItemDto> Channels { get; set; } = new();
        public List<RoleDto> Roles { get; set; } = new();
    }
    
    public class ServerMemberDto
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? GlobalNickname { get; set; } = string.Empty;
        public string? ServerNickname { get; set; }
        public string? Avatar { get; set; }
        public List<RoleDto> Roles { get; set; } = new();
        public Instant JoinedAt { get; set; }
        public bool Deafened { get; set; }
        public bool Muted { get; set; }
    }

    public class UpdateServerRequestDto
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        [MaxLength(500)]
        public string? Description { get; set; }
        public bool Public { get; set; } = false;
        [Url]
        public string? Icon { get; set; }
    }
    
    public class TransferOwnershipRequestDto
    {
        [Required]
        public long NewOwnerId { get; set; }
    }
    
    public class RoleDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Position { get; set; }
        public Permission Permissions { get; set; }
        public bool IsHoisted { get; set; }
        public bool IsMentionable { get; set; }
    }
}