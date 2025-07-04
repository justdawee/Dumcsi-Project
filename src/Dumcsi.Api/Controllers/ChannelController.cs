using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime.Extensions;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/channels/{id}")]
public class ChannelController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    private async Task<(bool, bool)> CheckMembershipAndPermission(long channelId, long userId, Permission requiredPermission, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var member = await dbContext.ServerMembers
            .AsNoTracking()
            .Include(m => m.Roles)
            .Where(m => m.User.Id == userId && m.Server.Channels.Any(c => c.Id == channelId))
            .FirstOrDefaultAsync(cancellationToken);

        if (member == null)
        {
            // A felhasználó nem tagja a szervernek, amelyhez a csatorna tartozik.
            return (false, false);
        }

        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

        // Az adminisztrátor mindent felülbírál.
        if (permissions.HasFlag(Permission.Administrator))
        {
            return (true, true);
        }

        // Ellenőrizzük, hogy a felhasználó rendelkezik-e a szükséges jogosultsággal.
        return (true, permissions.HasFlag(requiredPermission));
    }

    [HttpGet]  // GET /api/channels/{id}
    public async Task<IActionResult> GetChannel(long id, CancellationToken cancellationToken)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        
        var (isMember, hasPermission) = await CheckMembershipAndPermission(id, userId, Permission.ViewChannels, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server.");
        }
        if (!hasPermission)
        {
            return Forbid("You do not have permission to view this channel.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels
            .AsNoTracking()
            .Include(c => c.Messages
                .Where(m => m.ModerationStatus == ModerationStatus.Visible)
                .OrderByDescending(m => m.CreatedAt)
                .Take(50)) // Legutóbbi 50 üzenet
            .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (channel == null)
        {
            return NotFound("Channel not found.");
        }
        
        var response = new ChannelDtos.ChannelDetailDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            Position = channel.Position,
            CreatedAt = channel.CreatedAt,
            Messages = channel.Messages
                .OrderBy(m => m.CreatedAt) // Visszafordítjuk a sorrendet időrendbe
                .Select(m => new MessageDtos.MessageListItemDto
                {
                    Id = m.Id,
                    Content = m.Content,
                    SenderId = m.SenderId,
                    SenderUsername = m.Sender!.Username,
                    ModerationStatus = m.ModerationStatus,
                    CreatedAt = m.CreatedAt,
                    EditedAt = m.EditedAt
                }).ToList()
        };

        return Ok(response);
    }
    
    [HttpPatch] // PATCH /api/channels/{id}
    public async Task<IActionResult> UpdateChannel(long id, [FromBody] ChannelDtos.UpdateChannelRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        
        var (isMember, hasPermission) = await CheckMembershipAndPermission(id, userId, Permission.ManageChannels, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server.");
        }
        if (!hasPermission)
        {
            return Forbid("You do not have permission to manage this channel.");
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (channel == null)
        {
            return NotFound("Channel not found.");
        }

        channel.Name = request.Name;
        channel.Description = request.Description;
        channel.Position = request.Position;
        channel.UpdatedAt = DateTimeOffset.UtcNow.ToInstant();
        
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
    
    [HttpDelete] // DELETE /api/channels/{id}
    public async Task<IActionResult> DeleteChannel(long id, CancellationToken cancellationToken)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        
        var (isMember, hasPermission) = await CheckMembershipAndPermission(id, userId, Permission.ManageChannels, cancellationToken);
        
        if (!isMember)
        {
            return Forbid("You are not a member of this server.");
        }
        if (!hasPermission)
        {
            return Forbid("You do not have permission to delete this channel.");
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (channel == null)
        {
            return NotFound("Channel not found.");
        }

        dbContext.Channels.Remove(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}