using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Application.DTOs;

public class UserDtos
{
    public class UserProfileDto
    {
        public long Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
    }

    public class UpdateUserProfileDto
    {
        [Required]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters long.")]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
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