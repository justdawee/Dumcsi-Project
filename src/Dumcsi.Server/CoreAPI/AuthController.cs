using System.Security.Cryptography;
using Dumcsi.Server.Database;
using Dumcsi.Server.Database.Models;
using Dumcsi.Server.Services.JWTFactory;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NodaTime.Extensions;

namespace Dumcsi.Server.CoreAPI;

[Route("api/[controller]")]
[ApiController]
public class AuthController(IDbContextFactory<DumcsiDbContext> dbContextFactory, IJWTFactory jwtFactory) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthControllerModels.RegisterRequest request, CancellationToken cancellationToken)
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
    
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthControllerModels.LoginRequest request, CancellationToken cancellationToken)
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

        var token = jwtFactory.CreateToken(user.Id, user.Username);
        
        return Ok(token);
    }

    [Authorize]
    [HttpGet("teszt")]
    public Task<IActionResult> Test()
    {
        return Task.FromResult<IActionResult>(Ok());
    }
}