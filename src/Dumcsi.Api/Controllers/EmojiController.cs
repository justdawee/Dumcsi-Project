using Dumcsi.Api.Common;
using Dumcsi.Api.Helpers;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server/{serverId}/emojis")]
public class EmojiController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService)
    : BaseApiController(dbContextFactory)
{
    [HttpGet]
    public async Task<IActionResult> GetEmojis(long serverId, CancellationToken cancellationToken)
    {
        // Az emojik megtekintéséhez elég, ha a felhasználó látja a csatornákat (tagja a szervernek).
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
    public async Task<IActionResult> CreateEmoji(long serverId, [FromBody] EmojiDtos.CreateEmojiRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequestResponse("Invalid request data.");
        }
        
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ManageEmojis))
        {
            return ForbidResponse("You do not have permission to create emojis.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var server = await dbContext.Servers.FindAsync([serverId], cancellationToken);
        var creator = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);

        if (server == null || creator == null)
        {
            return NotFoundResponse("Server or creator not found.");
        }

        var emoji = new CustomEmoji
        {
            Name = request.Name,
            ImageUrl = request.ImageUrl,
            Server = server,
            Creator = creator,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.CustomEmojis.Add(emoji);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        // Audit log bejegyzés
        // Itt a TargetId lehetne maga az emoji ID-ja, de mivel az az adatbázisban generálódik,
        // a TargetType.Server-t használjuk és a changes-ben adjuk meg a részleteket.
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.EmojiCreated, serverId, AuditLogTargetType.Server, new { EmojiAdded = emoji.Name });


        return OkResponse(new EmojiDtos.EmojiDto { Id = emoji.Id, Name = emoji.Name, ImageUrl = emoji.ImageUrl }, "Emoji created successfully.");
    }

    [HttpDelete("{emojiId}")]
    public async Task<IActionResult> DeleteEmoji(long serverId, long emojiId, CancellationToken cancellationToken)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ManageEmojis))
        {
            return ForbidResponse("You do not have permission to delete emojis.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var emoji = await dbContext.CustomEmojis.FirstOrDefaultAsync(e => e.Id == emojiId && e.ServerId == serverId, cancellationToken);
        if (emoji == null)
        {
            return NotFoundResponse("Emoji not found.");
        }

        var deletedEmojiName = emoji.Name; // Mentsük a nevet a loghoz

        dbContext.CustomEmojis.Remove(emoji);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.EmojiDeleted, serverId, AuditLogTargetType.Server, new { EmojiRemoved = deletedEmojiName });

        return OkResponse("Emoji deleted successfully.");
    }
    
    [HttpPut("{emojiId}")]
    public async Task<IActionResult> UpdateEmoji(long serverId, long emojiId, [FromBody] EmojiDtos.UpdateEmojiRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequestResponse("Invalid request data.");
        }
        
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ManageEmojis))
        {
            return ForbidResponse("You do not have permission to update emojis.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var emoji = await dbContext.CustomEmojis.FirstOrDefaultAsync(e => e.Id == emojiId && e.ServerId == serverId, cancellationToken);
        if (emoji == null)
        {
            return NotFoundResponse("Emoji not found.");
        }

        emoji.Name = request.Name;

        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.EmojiUpdated, serverId, AuditLogTargetType.Server, new { EmojiUpdated = emoji.Name });

        return OkResponse(new EmojiDtos.EmojiDto { Id = emoji.Id, Name = emoji.Name, ImageUrl = emoji.ImageUrl }, "Emoji updated successfully.");
    }
}