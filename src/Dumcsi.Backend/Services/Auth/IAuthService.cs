using Dumcsi.Backend.Models.DTOs;

namespace Dumcsi.Backend.Services.Auth;

public interface IAuthService
{
    Task<Result> RegisterUserAsync(AuthControllerModels.RegisterRequestDto request, CancellationToken cancellationToken);
    Task<Result<TokenResponseDto>> LoginUserAsync(AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken);
    Task<Result<TokenResponseDto>> RefreshTokenAsync(AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken);
}
