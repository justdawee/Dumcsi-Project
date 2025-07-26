using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Application.DTOs;

public class FriendDtos
{
    public class FriendListItemDto
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public bool Online { get; set; }
    }

    public class FriendRequestDto
    {
        public long RequestId { get; set; }
        public long FromUserId { get; set; }
        public string FromUsername { get; set; } = string.Empty;
    }

    public class SendFriendRequestDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;
    }
}