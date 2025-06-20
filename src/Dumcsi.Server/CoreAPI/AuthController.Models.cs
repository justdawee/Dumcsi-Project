using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Server.CoreAPI;

public class AuthControllerModels
{
    public class RegisterRequest
    {
        [Required]
        public string Username { get; set; } = string.Empty;
        
        [MinLength(6)]
        [MaxLength(20)]
        public string Password { get; set; } = string.Empty;
        
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
    
    public class LoginRequest
    {
        [Required]
        public string UsernameOrEmail { get; set; } = string.Empty;
        
        [MinLength(6)]
        [MaxLength(20)]
        public string Password { get; set; } = string.Empty;
    }
}