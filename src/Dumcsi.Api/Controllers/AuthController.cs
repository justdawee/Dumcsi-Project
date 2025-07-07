using Dumcsi.Api.Common;
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
            ? Ok(ApiResponse.Success("Registration successful."))
            : Conflict(ApiResponse.Fail(result.Error ?? "An unknown error occurred."));
    }
    
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginUserAsync(request, cancellationToken);
        
        // A sikertelen bejelentkezésre 401 Unauthorized válasszal kell reagálni.
        if (!result.IsSuccess)
        {
            return Unauthorized(ApiResponse.Fail(result.Error ?? "Invalid credentials."));
        }

        return Ok(ApiResponse<TokenResponseDto>.Success(result.Value!));
    }
    
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.RefreshTokenAsync(request, cancellationToken);
        
        return result.IsSuccess 
            ? Ok(ApiResponse<TokenResponseDto>.Success(result.Value!))
            : Unauthorized(ApiResponse.Fail(result.Error ?? "Invalid refresh token."));
    }
}