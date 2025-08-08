using System.Security.Cryptography;
using Dumcsi.Backend.Services.Auth;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Services.Data;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Backend.Services.Auth;

public class AuthService(IDbContextFactory<DumcsiDbContext> dbContextFactory, IJWTFactory jwtFactory) : IAuthService
{
    public async Task<Result> RegisterUserAsync(AuthControllerModels.RegisterRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        // Check username and email separately
        if (await dbContext.Users.AnyAsync(u => u.Username == request.Username, cancellationToken))
        {
            return Result.Failure("AUTH_USERNAME_TAKEN");
        }
        
        if (await dbContext.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
        {
            return Result.Failure("AUTH_EMAIL_TAKEN");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = KeyDerivation.Pbkdf2(request.Password, salt, KeyDerivationPrf.HMACSHA256, 10000, 32);
        byte[] passwordHash = new byte[salt.Length + hash.Length];
       
        Buffer.BlockCopy(salt, 0, passwordHash, 0, salt.Length);
        Buffer.BlockCopy(hash, 0, passwordHash, salt.Length, hash.Length);
        
        var user = new User
        {
            Username = request.Username,
            GlobalNickname = request.Username, // Default is the same as username
            Email = request.Email,
            PasswordHash = passwordHash,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.Users.Add(user);
        
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DbUpdateException)
        {
            // Fallback error in case of race condition conflicts
            return Result.Failure("AUTH_REGISTRATION_CONFLICT");
        }
    }

    public async Task<Result<TokenResponseDto>> LoginUserAsync(AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == request.UsernameOrEmail || x.Email == request.UsernameOrEmail, cancellationToken);
        if (user == null)
        {
            // Handle case where user doesn't exist
            return Result.Failure<TokenResponseDto>("AUTH_USER_NOT_FOUND");
        }
        
        var salt = new byte[16];
        Buffer.BlockCopy(user.PasswordHash, 0, salt, 0, 16);
        var hash = KeyDerivation.Pbkdf2(request.Password, salt, KeyDerivationPrf.HMACSHA256, 10000, 32);
        
        var providedPasswordHash = new byte[salt.Length + hash.Length];
        Buffer.BlockCopy(salt, 0, providedPasswordHash, 0, salt.Length);
        Buffer.BlockCopy(hash, 0, providedPasswordHash, salt.Length, hash.Length);

        if (!providedPasswordHash.SequenceEqual(user.PasswordHash))
        {
            // Handle invalid password case
            return Result.Failure<TokenResponseDto>("AUTH_INVALID_PASSWORD");
        }

        return await GenerateAndSaveTokensAsync(user, dbContext, cancellationToken);
    }
    
    public async Task<Result<TokenResponseDto>> RefreshTokenAsync(AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var savedRefreshToken = await dbContext.UserRefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, cancellationToken);

        if (savedRefreshToken == null || savedRefreshToken.ExpiresAt < SystemClock.Instance.GetCurrentInstant())
        {
            return Result.Failure<TokenResponseDto>("AUTH_INVALID_REFRESH_TOKEN");
        }

        dbContext.UserRefreshTokens.Remove(savedRefreshToken);

        return await GenerateAndSaveTokensAsync(savedRefreshToken.User, dbContext, cancellationToken);
    }

    private async Task<Result<TokenResponseDto>> GenerateAndSaveTokensAsync(User user, DumcsiDbContext dbContext, CancellationToken cancellationToken)
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
