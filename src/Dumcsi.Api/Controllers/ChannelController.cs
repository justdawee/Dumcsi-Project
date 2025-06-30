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
    // Csatorna részletei + üzenetek
    [HttpGet]  // GET /api/channels/{id}
    public async Task<IActionResult> GetChannel(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
    
        var channel = await dbContext.Channels
            .Include(c => c.Server)
            .Include(c => c.Messages.Where(m => m.ModerationStatus == ModerationStatus.Visible))
            .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (channel == null)
        {
            return NotFound("Channel not found");
        }
        
        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == channel.ServerId && sm.UserId == userId, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server");
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
                .OrderBy(m => m.CreatedAt)
                .Take(50) 
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
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (channel == null)
        {
            return NotFound("Channel not found");
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == channel.ServerId && sm.UserId == userId, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server");
        }
        
        var memberRole = await dbContext.ServerMembers
            .Where(sm => sm.ServerId == channel.ServerId && sm.UserId == userId)
            .Select(sm => sm.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (memberRole == Role.Member)
        {
            return Forbid("Only moderators and admins can update channels");
        }

        // Csatorna frissítése logika itt

        channel.Name = request.Name;
        channel.Position = request.Position;
        channel.UpdatedAt = DateTimeOffset.UtcNow.ToInstant();
        dbContext.Channels.Update(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
    
    [HttpDelete] // DELETE /api/channels/{id}
    public async Task<IActionResult> DeleteChannel(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (channel == null)
        {
            return NotFound("Channel not found");
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
            return Unauthorized();

        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == channel.ServerId && sm.UserId == userId, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server");
        }
        
        var memberRole = await dbContext.ServerMembers
            .Where(sm => sm.ServerId == channel.ServerId && sm.UserId == userId)
            .Select(sm => sm.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (memberRole == Role.Member)
        {
            return Forbid("Only moderators and admins can delete channels");
        }

        dbContext.Channels.Remove(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}