using NodaTime;

namespace Dumcsi.Backend.Models.DTOs;

public class InviteDtos
{
    public class CreateInviteRequestDto
    {
        public int? ExpiresInHours { get; set; } = 1; // Default 1 hour
        public int MaxUses { get; set; } = 0; // 0 = unlimited
        public bool IsTemporary { get; set; } = false;
        public long? ChannelId { get; set; }
    }
    
    public class InviteInfoDto
    {
        public string Code { get; set; } = string.Empty;
        public ServerInfo Server { get; set; } = new();

        public class ServerInfo
        {
            public long Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? Icon { get; set; } 
            public int MemberCount { get; set; }
            public string? Description { get; set; }
        }
    }

    public class InviteDto
    {
        public string Code { get; set; } = string.Empty;
        public long ServerId { get; set; }
        public long? ChannelId { get; set; }
        public string? ChannelName { get; set; }
        public long CreatorId { get; set; }
        public string CreatorUsername { get; set; } = string.Empty;
        public string? CreatorAvatar { get; set; }
        public int MaxUses { get; set; }
        public int CurrentUses { get; set; }
        public Instant? ExpiresAt { get; set; }
        public bool IsTemporary { get; set; }
        public Instant CreatedAt { get; set; }
        public bool IsExpired { get; set; }
        public bool IsMaxUsesReached { get; set; }
    }

    public class CreateInviteResponseDto
    {
        public string Code { get; set; } = string.Empty;
        public int? ExpiresInHours { get; set; }
        public int MaxUses { get; set; }
        public bool IsTemporary { get; set; }
        public Instant CreatedAt { get; set; }
        public Instant? ExpiresAt { get; set; }
    }
}
