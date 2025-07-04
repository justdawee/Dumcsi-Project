using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server/{serverId}/emojis")]
public class EmojiController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    private async Task<bool> HasPermissionAsync(long serverId, Permission requiredPermission)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var member = await dbContext.ServerMembers.AsNoTracking().Include(m => m.Roles).FirstOrDefaultAsync(m => m.UserId == userId && m.ServerId == serverId);
        if (member == null) return false;
        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);
        if (permissions.HasFlag(Permission.Administrator)) return true;
        return permissions.HasFlag(requiredPermission);
    }

    [HttpGet]
    public async Task<IActionResult> GetEmojis(long serverId, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ViewChannels)) return Forbid();

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var emojis = await dbContext.CustomEmojis
            .Where(e => e.ServerId == serverId)
            .Select(e => new EmojiDtos.EmojiDto { Id = e.Id, Name = e.Name, ImageUrl = e.ImageUrl })
            .ToListAsync(cancellationToken);

        return Ok(emojis);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEmoji(long serverId, [FromBody] EmojiDtos.CreateEmojiRequestDto request, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageEmojis)) return Forbid();

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var server = await dbContext.Servers.FindAsync(new object[] { serverId }, cancellationToken);
        var creatorId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var creator = await dbContext.Users.FindAsync(new object[] { creatorId }, cancellationToken);
        if (server == null || creator == null) return NotFound();

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

        return Ok(new EmojiDtos.EmojiDto { Id = emoji.Id, Name = emoji.Name, ImageUrl = emoji.ImageUrl });
    }

    [HttpDelete("{emojiId}")]
    public async Task<IActionResult> DeleteEmoji(long serverId, long emojiId, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageEmojis)) return Forbid();

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var emoji = await dbContext.CustomEmojis.FirstOrDefaultAsync(e => e.Id == emojiId && e.ServerId == serverId, cancellationToken);
        if (emoji == null) return NotFound();

        dbContext.CustomEmojis.Remove(emoji);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}