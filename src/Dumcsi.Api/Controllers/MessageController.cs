using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using NodaTime.Extensions;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/channels/{id}/messages")]
public class MessageController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    // POST /channels/{channelId}/messages - Új üzenet küldése
    [HttpPost]
    public async Task<IActionResult> SendMessage(long id, 
        [FromBody] MessageDtos.CreateMessageRequestDto request, 
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var channel = await dbContext.Channels
            .Include(c => c.Server)
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

        var message = new Message
        {
            ChannelId = id,
            SenderId = userId,
            Content = request.Content,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            ModerationStatus = ModerationStatus.Visible,
            Channel = channel,
            Sender = await dbContext.Users.FindAsync(userId, cancellationToken)!
        };
        
        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        return CreatedAtAction(nameof(GetMessage), new { id, messageId = message.Id }, 
            new MessageDtos.MessageDto
            {
                Id = message.Id,
                ChannelId = message.ChannelId,
                UserId = message.SenderId,
                Content = message.Content,
                CreatedAt = message.CreatedAt,
                EditedAt = message.EditedAt
            });
    }

    // GET /channels/{channelId}/messages - Üzenetek listázása lapozással
    [HttpGet]
    public async Task<IActionResult> GetMessages(long id,
        CancellationToken cancellationToken,
        [FromQuery] long? before = null,
        [FromQuery] int limit = 50)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var channel = await dbContext.Channels
            .Include(c => c.Server)
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

        // Limit validation
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100; // Discord-like limit

        IQueryable<Message> query = dbContext.Messages
            .Where(m => m.ChannelId == id && m.ModerationStatus == ModerationStatus.Visible)
            .Include(m => m.Sender);

        // Pagination - before parameter
        if (before.HasValue)
        {
            query = query.Where(m => m.Id < before.Value);
        }

        var messages = await query
            .OrderByDescending(m => m.Id)
            .Take(limit)
            .Select(m => new MessageDtos.MessageListItemDto
            {
                Id = m.Id,
                Content = m.Content,
                SenderId = m.SenderId,
                SenderUsername = m.Sender!.Username,
                ModerationStatus = m.ModerationStatus,
                CreatedAt = m.CreatedAt,
                EditedAt = m.EditedAt
            })
            .ToListAsync(cancellationToken);

        // Reverse to get chronological order (newest last)
        messages.Reverse();

        return Ok(messages);
    }

    // GET /channels/{channelId}/messages/{messageId} - Specifikus üzenet lekérése
    [HttpGet("{messageId}")]
    public async Task<IActionResult> GetMessage(long id, long messageId, 
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages
            .Include(m => m.Channel)
            .ThenInclude(c => c.Server)
            .Include(m => m.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == id, cancellationToken);
        
        if (message == null)
        {
            return NotFound("Message not found");
        }
        
        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == message.Channel.ServerId && sm.UserId == userId, cancellationToken);
        
        if (!isMember)
        {
            return Forbid("You are not a member of this server");
        }

        var response = new MessageDtos.MessageDetailDto
        {
            Id = message.Id,
            ChannelId = message.ChannelId,
            UserId = message.SenderId,
            Username = message.Sender!.Username,
            Content = message.Content,
            CreatedAt = message.CreatedAt,
            EditedAt = message.EditedAt
        };

        return Ok(response);
    }

    // PATCH /channels/{channelId}/messages/{messageId} - Üzenet szerkesztése
    [HttpPatch("{messageId}")]
    public async Task<IActionResult> EditMessage(long id, long messageId,
        [FromBody] MessageDtos.UpdateMessageRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages
            .Include(m => m.Channel)
            .ThenInclude(c => c.Server)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == id, cancellationToken);
        
        if (message == null)
        {
            return NotFound("Message not found");
        }
        
        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == message.Channel.ServerId && sm.UserId == userId, cancellationToken);
        
        if (!isMember)
        {
            return Forbid("You are not a member of this server");
        }

        // Only message sender can edit their own message
        if (message.SenderId != userId)
        {
            return Forbid("You can only edit your own messages");
        }

        // Update message content and edited timestamp
        message.Content = request.Content;
        message.EditedAt = SystemClock.Instance.GetCurrentInstant();

        dbContext.Messages.Update(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    // DELETE /channels/{channelId}/messages/{messageId} - Üzenet törlése
    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(long id, long messageId,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages
            .Include(m => m.Channel)
            .ThenInclude(c => c.Server)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == id, cancellationToken);
        
        if (message == null)
        {
            return NotFound("Message not found");
        }
        
        var membershipInfo = await dbContext.ServerMembers
            .FirstOrDefaultAsync(sm => sm.ServerId == message.Channel.ServerId && sm.UserId == userId, cancellationToken);
        
        if (membershipInfo == null)
        {
            return Forbid("You are not a member of this server");
        }

        // Message can be deleted by:
        // 1. The message sender
        // 2. Moderators/Admins
        bool canDelete = message.SenderId == userId || 
                        membershipInfo.Role == Role.Moderator || 
                        membershipInfo.Role == Role.Admin;

        if (!canDelete)
        {
            return Forbid("You can only delete your own messages or you need moderator permissions");
        }

        // Soft delete - set moderation status instead of hard delete
        message.ModerationStatus = message.SenderId == userId 
            ? ModerationStatus.UserDeleted 
            : ModerationStatus.ModeratedRemoved;

        dbContext.Messages.Update(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}