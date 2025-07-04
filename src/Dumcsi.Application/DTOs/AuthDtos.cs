using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Application.DTOs;

public class AuthControllerModels
{
    //POST /api/auth/register request
    public class RegisterRequestDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;
        
        [MinLength(6)]
        [MaxLength(20)]
        public string Password { get; set; } = string.Empty;
        
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
    
    //POST /api/auth/login request
    public class LoginRequestDto
    {
        [Required]
        public string UsernameOrEmail { get; set; } = string.Empty;
        
        [MinLength(6)]
        [MaxLength(20)]
        public string Password { get; set; } = string.Empty;
    }
    
    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}