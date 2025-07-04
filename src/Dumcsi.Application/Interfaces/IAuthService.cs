using Dumcsi.Application.DTOs;

namespace Dumcsi.Application.Interfaces;

public interface IAuthService
{
    Task<Result> RegisterUserAsync(AuthControllerModels.RegisterRequestDto request, CancellationToken cancellationToken);
    Task<Result<TokenResponseDto>> LoginUserAsync(AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken);
    Task<Result<TokenResponseDto>> RefreshTokenAsync(AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken);
}