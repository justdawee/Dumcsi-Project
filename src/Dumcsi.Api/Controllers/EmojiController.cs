using Dumcsi.Api.Common;
using Dumcsi.Api.Helpers;
using Dumcsi.Api.Hubs;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using SixLabors.ImageSharp;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server/{serverId}/emojis")]
public class EmojiController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IFileStorageService fileStorageService,
    IHubContext<ChatHub> chatHubContext)
    : BaseApiController(dbContextFactory)
{
    [HttpGet]
    public async Task<IActionResult> GetEmojis(long serverId, CancellationToken cancellationToken)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ViewChannels))
        {
            return ForbidResponse();
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var emojis = await dbContext.CustomEmojis
            .AsNoTracking()
            .Where(e => e.ServerId == serverId)
            .Select(e => new EmojiDtos.EmojiDto { Id = e.Id, Name = e.Name, ImageUrl = e.ImageUrl })
            .ToListAsync(cancellationToken);

        return OkResponse(emojis);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEmoji(long serverId, [FromForm] string name, [FromForm] IFormFile? file)
    {
        // 1. Jogosultság ellenőrzése
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ManageEmojis))
        {
            return ForbidResponse("You do not have permission to create emojis.");
        }

        // 2. Validációk
        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
        {
            return BadRequestResponse("Emoji name must be at least 2 characters long.");
        }
        
        if (file == null || file.Length == 0)
        {
            return BadRequestResponse("No file uploaded.");
        }

        if (file.Length > 8 * 1024 * 1024) // max 8MB
        {
            return BadRequestResponse("File size cannot exceed 8MB.");
        }

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            return BadRequestResponse("Invalid file type. Only JPG, PNG, GIF, WEBP, and AVIF are allowed.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync();
        var server = await dbContext.Servers.FindAsync(serverId);
        var creator = await dbContext.Users.FindAsync(CurrentUserId);
        if (server == null || creator == null)
        {
            return NotFoundResponse("Server or creator not found.");
        }

        try
        {
            // 3. Képfeldolgozás
            using var image = await Image.LoadAsync(file.OpenReadStream());

            if (image.Width > 128 || image.Height > 128)
            {
                return BadRequestResponse("Image dimensions cannot exceed 128x128 pixels.");
            }
            
            // A kép mentése egy memory stream-be a feltöltéshez
            await using var memoryStream = new MemoryStream();
            // A GIF-eket nem kódoljuk újra, hogy megmaradjon az animáció. A többit egységesen PNG-be mentjük.
            if (file.ContentType.ToLower() == "image/gif")
            {
                // Visszaírjuk az eredeti streamet a memory stream-be
                await file.OpenReadStream().CopyToAsync(memoryStream);
            }
            else
            {
                // Itt jöhetne a 256KB-ra való tömörítés logikája, pl. a PNG encoder minőségének állításával.
                // Ez egy komplexebb feladat, most a méretkorlátot a validációnál kezeljük.
                await image.SaveAsPngAsync(memoryStream);
            }
            memoryStream.Position = 0;

            // 4. Feltöltés a MinIO-ba
            var emojiFileName = $":{name}:"; // A naming scheme-et a fájlnévben is használhatjuk
            var emojiUrl = await fileStorageService.UploadFileAsync(memoryStream, emojiFileName, file.ContentType);

            // 5. Adatbázis mentés
            var emoji = new CustomEmoji
            {
                Name = name, // Az adatbázisban a tiszta nevet tároljuk
                ImageUrl = emojiUrl,
                Server = server,
                Creator = creator,
                CreatedAt = SystemClock.Instance.GetCurrentInstant()
            };

            dbContext.CustomEmojis.Add(emoji);
            await dbContext.SaveChangesAsync();
            
            // 6. Audit Naplózás
            await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.ServerUpdated, serverId, AuditLogTargetType.Server, new { EmojiAdded = emoji.Name });

            // 7. Értesítés a klienseken keresztül
            var emojiDto = new EmojiDtos.EmojiDto { Id = emoji.Id, Name = emoji.Name, ImageUrl = emoji.ImageUrl };
            
            await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("EmojiCreated", emojiDto);
            
            return OkResponse(new EmojiDtos.EmojiDto { Id = emoji.Id, Name = emoji.Name, ImageUrl = emoji.ImageUrl }, "Emoji created successfully.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse.Fail($"An error occurred while processing the emoji: {ex.Message}"));
        }
    }

    [HttpDelete("{emojiId}")]
    public async Task<IActionResult> DeleteEmoji(long serverId, long emojiId)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ManageEmojis))
        {
            return ForbidResponse("You do not have permission to delete emojis.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync();
        var emoji = await dbContext.CustomEmojis.FirstOrDefaultAsync(e => e.Id == emojiId && e.ServerId == serverId);
        if (emoji == null)
        {
            return NotFoundResponse("Emoji not found.");
        }
        
        // Fájl törlése a MinIO-ból
        var fileName = Path.GetFileName(new Uri(emoji.ImageUrl).LocalPath);
        await fileStorageService.DeleteFileAsync(fileName);
        
        var deletedEmojiName = emoji.Name;

        dbContext.CustomEmojis.Remove(emoji);
        await dbContext.SaveChangesAsync();
        
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.ServerUpdated, serverId, AuditLogTargetType.Server, new { EmojiRemoved = deletedEmojiName });

        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("EmojiDeleted", new { ServerId = serverId, EmojiId = emojiId });
        
        return OkResponse("Emoji deleted successfully.");
    }
}