using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Backend.Models.DTOs;

public class UserDtos
{
    public class UserProfileDto
    {
        public long Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? GlobalNickname { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public string? Locale { get; set; }
        public bool? Verified { get; set; }
    }

    public class UpdateUserProfileDto
    {
        [Required]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters long.")]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [StringLength(100)]
        public string? GlobalNickname { get; set; }

        [Url]
        public string? Avatar { get; set; }
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6, ErrorMessage = "The new password must be at least 6 characters long.")]
        [MaxLength(100)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
