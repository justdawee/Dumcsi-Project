using Dumcsi.Application.DTOs;
using Dumcsi.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Dumcsi.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthControllerModels.RegisterRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterUserAsync(request, cancellationToken);
        
        return result.IsSuccess 
            ? Ok() 
            : Conflict(new { message = result.Error });
    }
    
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginUserAsync(request, cancellationToken);
        
        return result.IsSuccess 
            ? Ok(result.Value) 
            : Unauthorized(new { message = result.Error });
    }
    
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.RefreshTokenAsync(request, cancellationToken);
        
        return result.IsSuccess 
            ? Ok(result.Value) 
            : Unauthorized(new { message = result.Error });
    }
}