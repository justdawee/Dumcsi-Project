using System.Security.Cryptography;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime.Extensions;

namespace Dumcsi.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IDbContextFactory<DumcsiDbContext> dbContextFactory, IJWTFactory jwtFactory) : ControllerBase
{
    [HttpPost("register")] // POST /api/auth/register
    public async Task<IActionResult> Register([FromBody] AuthControllerModels.RegisterRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        byte[] passwordHash = new byte[16+32];
        
        var salt = RandomNumberGenerator.GetBytes(16);
        
        var hash = KeyDerivation.Pbkdf2(
            password: request.Password,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 10000,
            numBytesRequested: 32
        );
        
       salt.CopyTo(passwordHash, 0);
       hash.CopyTo(passwordHash, 16);
        
        User user = new User
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
        }
        catch (DbUpdateException)
        {
            return Conflict("This username or email is already taken.");
        }
        
        return Ok();
    }
    
    [HttpPost("login")] // POST /api/auth/login
    public async Task<IActionResult> Login([FromBody] AuthControllerModels.LoginRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == request.UsernameOrEmail || x.Email == request.UsernameOrEmail, cancellationToken);
        
        if (user == null)
        {
            return Unauthorized("Invalid username or password.");
        }
        
        byte[] passwordHash = new byte[16+32];
        
        var salt = user.PasswordHash[..16];
        
        var hash = KeyDerivation.Pbkdf2(
            password: request.Password,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 10000,
            numBytesRequested: 32
        );
        
        salt.CopyTo(passwordHash, 0);
        hash.CopyTo(passwordHash, 16);
        
        if (!passwordHash.SequenceEqual(user.PasswordHash))
        {
            return Unauthorized("Invalid username or password.");
        }

        // 1. Generáljuk az Access Tokent
        var accessToken = jwtFactory.CreateToken(user.Id, user.Username, user.SecurityStamp);

        // 2. Generálunk egy új Refresh Tokent
        var refreshToken = new UserRefreshToken
        {
            User = user,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)), // Biztonságos, véletlenszerű token
            ExpiresAt = NodaTime.SystemClock.Instance.GetCurrentInstant().Plus(NodaTime.Duration.FromDays(7)), // Legyen érvényes 7 napig
            CreatedAt = NodaTime.SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.UserRefreshTokens.Add(refreshToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        // 3. Visszaadjuk mindkét tokent
        return Ok(new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token
        });
    }
    
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] AuthControllerModels.RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        // 1. Megkeressük a refresh tokent az adatbázisban, a hozzá tartozó felhasználóval együtt.
        var savedRefreshToken = await dbContext.UserRefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, cancellationToken);

        // 2. Validáljuk a tokent
        if (savedRefreshToken == null)
        {
            return Unauthorized("Invalid refresh token.");
        }

        if (savedRefreshToken.ExpiresAt < NodaTime.SystemClock.Instance.GetCurrentInstant())
        {
            return Unauthorized("Refresh token has expired.");
        }

        var user = savedRefreshToken.User;

        // 3. Generálunk egy új Access Tokent
        var newAccessToken = jwtFactory.CreateToken(user.Id, user.Username, user.SecurityStamp);
        
        // 4. Generálunk egy új Refresh Tokent, és eltávolítjuk a régit
        var newRefreshToken = new UserRefreshToken
        {
            User = user,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = NodaTime.SystemClock.Instance.GetCurrentInstant().Plus(NodaTime.Duration.FromDays(7)),
            CreatedAt = NodaTime.SystemClock.Instance.GetCurrentInstant()
        };
    
        dbContext.UserRefreshTokens.Remove(savedRefreshToken); // Régi törlése
        dbContext.UserRefreshTokens.Add(newRefreshToken);     // Új hozzáadása

        await dbContext.SaveChangesAsync(cancellationToken);

        // 5. Visszaadjuk az új tokeneket
        return Ok(new
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken.Token
        });
    }
    
}