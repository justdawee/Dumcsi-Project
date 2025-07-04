using System.Security.Cryptography;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using NodaTime.Extensions;

namespace Dumcsi.Infrastructure.Services;

public class AuthService(IDbContextFactory<DumcsiDbContext> dbContextFactory, IJWTFactory jwtFactory) : IAuthService
{
    public async Task<Result> RegisterUserAsync(AuthControllerModels.RegisterRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        byte[] passwordHash = new byte[16+32];
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = KeyDerivation.Pbkdf2(request.Password, salt, KeyDerivationPrf.HMACSHA256, 10000, 32);
       
        salt.CopyTo(passwordHash, 0);
        hash.CopyTo(passwordHash, 16);
        
        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        dbContext.Users.Add(user);
        
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DbUpdateException)
        {
            return Result.Failure("This username or email is already taken.");
        }
    }

    public async Task<Result<TokenResponseDto>> LoginUserAsync(AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == request.UsernameOrEmail || x.Email == request.UsernameOrEmail, cancellationToken);
        if (user == null)
        {
            return Result.Failure<TokenResponseDto>("Invalid username or password.");
        }
        
        var salt = user.PasswordHash[..16];
        var hash = KeyDerivation.Pbkdf2(request.Password, salt, KeyDerivationPrf.HMACSHA256, 10000, 32);
        byte[] providedPasswordHash = new byte[48];
        salt.CopyTo(providedPasswordHash, 0);
        hash.CopyTo(providedPasswordHash, 16);

        if (!providedPasswordHash.SequenceEqual(user.PasswordHash))
        {
            return Result.Failure<TokenResponseDto>("Invalid username or password.");
        }

        return await GenerateTokensAsync(user, dbContext, cancellationToken);
    }
    
    public async Task<Result<TokenResponseDto>> RefreshTokenAsync(AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var savedRefreshToken = await dbContext.UserRefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, cancellationToken);

        if (savedRefreshToken == null)
        {
            return Result.Failure<TokenResponseDto>("Invalid refresh token.");
        }

        if (savedRefreshToken.ExpiresAt < SystemClock.Instance.GetCurrentInstant())
        {
            return Result.Failure<TokenResponseDto>("Refresh token has expired.");
        }

        // Régi token törlése
        dbContext.UserRefreshTokens.Remove(savedRefreshToken);

        return await GenerateTokensAsync(savedRefreshToken.User, dbContext, cancellationToken);
    }

    private async Task<Result<TokenResponseDto>> GenerateTokensAsync(User user, DumcsiDbContext dbContext, CancellationToken cancellationToken)
    {
        var accessToken = jwtFactory.CreateToken(user.Id, user.Username, user.SecurityStamp);

        var refreshToken = new UserRefreshToken
        {
            User = user,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = SystemClock.Instance.GetCurrentInstant().Plus(Duration.FromDays(7)),
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.UserRefreshTokens.Add(refreshToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var tokenResponse = new TokenResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token
        };
        
        return Result.Success(tokenResponse);
    }
}