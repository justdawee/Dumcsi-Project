using System.Security.Cryptography;
using Dumcsi.Api.Common;
using Dumcsi.Api.Hubs;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;


namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/user")]
public class UserController(IDbContextFactory<DumcsiDbContext> dbContextFactory, IFileStorageService fileStorageService, IHubContext<ChatHub> chatHubContext) 
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
            return BadRequestResponse("Invalid request data.");
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
        
        // Értesítjük a klienseket a profil frissítéséről
        var updatedUserProfile = new UserDtos.UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            GlobalNickname = user.GlobalNickname,
            Email = user.Email,
            Avatar = user.Avatar
        };
        
        await chatHubContext.Clients.All.SendAsync("UserUpdated", updatedUserProfile, cancellationToken);

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
    
    [HttpPost("me/avatar")]
    public async Task<IActionResult> UploadOrUpdateAvatar(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequestResponse("No file uploaded.");
        }

        // 1. Validációk a kérés alapján
        if (file.Length > 10 * 1024 * 1024) // max 10MB
        {
            return BadRequestResponse("File size cannot exceed 10MB.");
        }

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            return BadRequestResponse("Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync();
        var user = await dbContext.Users.FindAsync(CurrentUserId);
        if (user == null)
        {
            return NotFoundResponse("User not found.");
        }

        try
        {
            // 2. Képfeldolgozás
            using var image = await Image.LoadAsync(file.OpenReadStream());

            if (image.Width > 1024 || image.Height > 1024)
            {
                return BadRequestResponse("Image dimensions cannot exceed 1024x1024 pixels.");
            }

            // A kép átméretezése (opcionális, de ajánlott a konzisztencia miatt)
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(256, 256), // Egységes méretre hozzuk az avatarokat
                Mode = ResizeMode.Crop
            }));

            await using var memoryStream = new MemoryStream();
            await image.SaveAsPngAsync(memoryStream); // Mindent PNG-ként mentünk az egységességért
            memoryStream.Position = 0;

            // 3. Régi kép törlése a MinIO-ból
            if (!string.IsNullOrEmpty(user.Avatar))
            {
                try
                {
                    var oldFileName = Path.GetFileName(new Uri(user.Avatar).LocalPath);
                    await fileStorageService.DeleteFileAsync(oldFileName);
                }
                catch
                {
                    // Ha a törlés nem sikerül (pl. már nem létezik), nem állítjuk le a folyamatot, csak logolhatnánk.
                }
            }

            // 4. Új kép feltöltése
            var newAvatarUrl = await fileStorageService.UploadFileAsync(memoryStream, $"{CurrentUserId}_avatar.png", "image/png");

            // 5. Adatbázis frissítése
            user.Avatar = newAvatarUrl;
            await dbContext.SaveChangesAsync();
            
            // 6. Értesítés a klienseknek
            var updatedUserProfile = new UserDtos.UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                GlobalNickname = user.GlobalNickname,
                Email = user.Email,
                Avatar = user.Avatar
            };
            
            await chatHubContext.Clients.All.SendAsync("UserUpdated", updatedUserProfile);

            return OkResponse(new { url = newAvatarUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse.Fail($"An error occurred while processing the image: {ex.Message}"));
        }
    }

    [HttpDelete("me/avatar")]
    public async Task<IActionResult> DeleteAvatar()
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync();
        var user = await dbContext.Users.FindAsync(CurrentUserId);
        if (user == null)
        {
            return NotFoundResponse("User not found.");
        }

        if (string.IsNullOrEmpty(user.Avatar))
        {
            return OkResponse("User has no avatar to delete.");
        }

        // Fájl törlése a MinIO-ból
        try
        {
            var fileName = Path.GetFileName(new Uri(user.Avatar).LocalPath);
            await fileStorageService.DeleteFileAsync(fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse.Fail($"An error occurred while deleting the avatar: {ex.Message}"));
        }

        // Adatbázis frissítése
        user.Avatar = null;
        await dbContext.SaveChangesAsync();
        
        // Értesítés a klienseknek
        var updatedUserProfile = new UserDtos.UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            GlobalNickname = user.GlobalNickname,
            Email = user.Email,
            Avatar = null // Az avatar URL-t null-ra állítjuk
        };
        await chatHubContext.Clients.All.SendAsync("UserUpdated", updatedUserProfile);

        return OkResponse("Avatar deleted successfully.");
    }
    
    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return OkResponse(new List<UserDtos.UserProfileDto>());
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var users = await dbContext.Users
            .AsNoTracking()
            .Where(u => 
                u.Username.ToLower().Contains(query.ToLower()) || 
                (u.GlobalNickname != null && u.GlobalNickname.ToLower().Contains(query.ToLower()))
            )
            .Take(20) // Limitáljuk a találatok számát a teljesítmény érdekében
            .Select(u => new UserDtos.UserProfileDto
            {
                Id = u.Id,
                Username = u.Username,
                GlobalNickname = u.GlobalNickname,
                Avatar = u.Avatar
            })
            .ToListAsync(cancellationToken);

        return OkResponse(users);
    }
}