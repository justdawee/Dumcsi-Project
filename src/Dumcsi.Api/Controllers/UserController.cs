using System.Security.Cryptography;
using Dumcsi.Api.Common;
using Dumcsi.Application.DTOs;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/user")]
public class UserController(IDbContextFactory<DumcsiDbContext> dbContextFactory) 
    : BaseApiController(dbContextFactory)
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId, cancellationToken);

        if (user == null)
        {
            return NotFoundResponse("User not found.");
        }

        var userProfile = new UserDtos.UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Avatar = user.Avatar,
            GlobalNickname = user.GlobalNickname,
            Locale = user.Locale,
            Verified = user.Verified
        };

        return OkResponse(userProfile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UserDtos.UpdateUserProfileDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequestResponse("Invalid request data."); // <-- Szabványos válasz
        }
        
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null)
        {
            return NotFoundResponse("User not found.");
        }

        if (await dbContext.Users.AnyAsync(u => u.Id != CurrentUserId && (u.Username == request.Username || u.Email == request.Email), cancellationToken))
        {
            return Conflict(ApiResponse.Fail("Username or email is already taken."));
        }

        user.Username = request.Username;
        user.Email = request.Email;
        user.GlobalNickname = request.GlobalNickname;
        user.Avatar = request.Avatar;

        await dbContext.SaveChangesAsync(cancellationToken);

        return OkResponse("Profile updated successfully.");
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMyAccount(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null)
        {
            return NotFoundResponse("User not found.");
        }

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return OkResponse("Account deleted successfully.");
    }

    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangeMyPassword([FromBody] UserDtos.ChangePasswordDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequestResponse("Invalid request data.");
        }
        
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null)
        {
            return NotFoundResponse("User not found.");
        }

        // Jelenlegi jelszó ellenőrzése
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
            return BadRequestResponse("Invalid current password.");
        }

        // Új jelszó hashelése
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
        user.SecurityStamp = Guid.NewGuid().ToString();

        await dbContext.SaveChangesAsync(cancellationToken);

        return OkResponse("Password changed successfully.");
    }
}