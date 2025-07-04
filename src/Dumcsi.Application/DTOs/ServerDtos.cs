using System.ComponentModel.DataAnnotations;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class ServerDtos
{
    public class ServerListItemDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? IconUrl { get; set; }
        public int MemberCount { get; set; }
        public long OwnerId { get; set; }
        public bool IsOwner { get; set; }
        public int MemberLimit { get; set; }
        public bool IsPublic { get; set; }
        public Instant CreatedAt { get; set; }
    }
    
    public class CreateServerRequestDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPublic { get; set; } = false;
    }
    
    public class ServerDetailDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? IconUrl { get; set; }
        public long OwnerId { get; set; }
        public string OwnerUsername { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public bool IsOwner { get; set; }
        public bool IsPublic { get; set; }
        
        public Permission CurrentUserPermissions { get; set; }
        
        public Instant CreatedAt { get; set; }
        
        public List<ChannelDto> Channels { get; set; } = new();
    }
    
    public class ChannelDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ChannelType Type { get; set; }
        public int Position { get; set; }
    }
    
    public class ServerMemberDto
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        
        public List<RoleDto> Roles { get; set; } = new();
        
        public Instant JoinedAt { get; set; }
    }
    
    public class JoinServerRequestDto
    {
        public string InviteCode { get; set; } = string.Empty;
        
    }
    
    public class UpdateServerRequestDto
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        [MaxLength(500)]
        public string? Description { get; set; }
        public bool IsPublic { get; set; } = false;
        public string? IconUrl { get; set; } // Optional icon URL
    }
    
    public class RoleDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public int Position { get; set; }
        public Permission Permissions { get; set; }
    }
}