using System.ComponentModel.DataAnnotations;
using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class ServerDtos
{
    // GET /api/server response
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
    
    // POST /api/server request
    public class CreateServerRequestDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPublic { get; set; } = false;
    }
    
    // GET /api/server/{id} response
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
        public Role CurrentUserRole { get; set; }  // ← Fontos!
        public Instant CreatedAt { get; set; }
        
        public List<ChannelDto> Channels { get; set; } = new();
    }
    
    // GET /api/server/{id}/channels response
    public class ChannelDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public ChannelType Type { get; set; }
        public int Position { get; set; }
    }
    
    // GET /api/server/{id}/members response
    public class ServerMemberDto
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        public Role Role { get; set; }
        public Instant JoinedAt { get; set; }
    }
    
    // POST /api/server/{id}/join request
    public class JoinServerRequestDto
    {
        public string InviteCode { get; set; } = string.Empty;
    }
}