using System.Security.Claims;
using System.Security.Cryptography;
using Dumcsi.Application.DTOs;
using Dumcsi.Application.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/user")]
public class UserController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out var userId))
        {
            throw new InvalidOperationException("User ID not found in token.");
        }
        return userId;
    }
    
    [HttpGet("me")] // GET /api/user/me
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return NotFound("User not found.");
        }

        var userProfile = new UserDtos.UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Avatar = user.Avatar
        };

        return Ok(userProfile);
    }

    [HttpPut("me")] // PUT /api/user/me
    public async Task<IActionResult> UpdateMyProfile([FromBody] UserDtos.UpdateUserProfileDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([userId], cancellationToken: cancellationToken);

        if (user == null)
        {
            return NotFound("User not found.");
        }

        // Check if the new username or email is already taken by another user
        if (await dbContext.Users.AnyAsync(u => u.Id != userId && (u.Username == request.Username || u.Email == request.Email), cancellationToken))
        {
            return Conflict("Username or email is already taken.");
        }

        user.Username = request.Username;
        user.Email = request.Email;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
    
    [HttpDelete("me")] // DELETE /api/user/me
    public async Task<IActionResult> DeleteMyAccount(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([userId], cancellationToken: cancellationToken);

        if (user == null)
        {
            return NotFound("User not found.");
        }

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("me/change-password")] // POST /api/user/me/change-password
    public async Task<IActionResult> ChangeMyPassword([FromBody] UserDtos.ChangePasswordDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([userId], cancellationToken: cancellationToken);

        if (user == null)
        {
            return NotFound("User not found.");
        }
        
        // Verify current password
        var salt = user.PasswordHash[..16];
        var hash = KeyDerivation.Pbkdf2(
            password: request.CurrentPassword,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 10000,
            numBytesRequested: 32
        );

        byte[] currentPasswordHash = new byte[48];
        salt.CopyTo(currentPasswordHash, 0);
        hash.CopyTo(currentPasswordHash, 16);

        if (!currentPasswordHash.SequenceEqual(user.PasswordHash))
        {
            return BadRequest("Invalid current password.");
        }

        // Hash new password
        var newSalt = RandomNumberGenerator.GetBytes(16);
        var newHash = KeyDerivation.Pbkdf2(
            password: request.NewPassword,
            salt: newSalt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 10000,
            numBytesRequested: 32
        );

        byte[] newPasswordHash = new byte[48];
        newSalt.CopyTo(newPasswordHash, 0);
        newHash.CopyTo(newPasswordHash, 16);

        user.PasswordHash = newPasswordHash;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { Message = "Password changed successfully." });
        
    }
}