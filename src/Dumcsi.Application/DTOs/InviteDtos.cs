namespace Dumcsi.Application.DTOs;

public class InviteDtos
{
    public class CreateInviteRequestDto
    {
        public int? ExpiresInHours { get; set; }
        public int MaxUses { get; set; } = 0;
        public bool IsTemporary { get; set; } = false;
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
}