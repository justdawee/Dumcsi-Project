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
    private async Task<(bool IsMember, bool HasPermission, long ServerId)> CheckPermissionsForChannel(long channelId, long userId, Permission requiredPermission, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        // Lekérdezzük a tagságot, a szerepköröket és a szerver ID-t egyetlen lekérdezéssel.
        var memberInfo = await dbContext.ServerMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Server.Channels.Any(c => c.Id == channelId))
            .Select(m => new 
            {
                m.ServerId,
                Roles = m.Roles.Select(r => r.Permissions).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (memberInfo == null)
        {
            // Nem tagja a szervernek.
            return (false, false, 0);
        }

        // Összesítjük a jogosultságokat.
        var permissions = memberInfo.Roles.Aggregate(Permission.None, (current, rolePermissions) => current | rolePermissions);

        // Adminisztrátor mindenre jogosult.
        if (permissions.HasFlag(Permission.Administrator))
        {
            return (true, true, memberInfo.ServerId);
        }

        // Ellenőrizzük a konkrét jogosultságot.
        return (true, permissions.HasFlag(requiredPermission), memberInfo.ServerId);
    }
    
    // POST /channels/{channelId}/messages - Új üzenet küldése
    [HttpPost]
    public async Task<IActionResult> SendMessage(long channelId, [FromBody] MessageDtos.CreateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var (isMember, hasPermission, _) = await CheckPermissionsForChannel(channelId, userId, Permission.SendMessages, cancellationToken);

        if (!isMember) return Forbid("You are not a member of this server.");
        if (!hasPermission) return Forbid("You do not have permission to send messages in this channel.");
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var channel = await dbContext.Channels.FindAsync([channelId], cancellationToken);
        var sender = await dbContext.Users.FindAsync([userId], cancellationToken);
        
        if (channel == null || sender == null)
        {
            return NotFound("Channel or user not found.");
        }

        var message = new Message
        {
            ChannelId = channelId,
            SenderId = userId,
            Content = request.Content,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            ModerationStatus = ModerationStatus.Visible,
            Channel = channel,
            Sender = sender
        };

        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetMessage), new { channelId, messageId = message.Id }, 
            new MessageDtos.MessageDto
            {
                Id = message.Id,
                ChannelId = message.ChannelId,
                UserId = message.SenderId,
                Username = sender.Username, // Itt már használhatjuk a betöltött 'sender' objektumot.
                Content = message.Content,
                CreatedAt = message.CreatedAt,
                EditedAt = message.EditedAt
            });
    }

    // GET /channels/{channelId}/messages - Üzenetek listázása lapozással
    [HttpGet]
    public async Task<IActionResult> GetMessages(long channelId, CancellationToken cancellationToken, [FromQuery] long? before = null, [FromQuery] int limit = 50)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        
        var (isMember, hasPermission, _) = await CheckPermissionsForChannel(channelId, userId, Permission.ReadMessageHistory, cancellationToken);
        
        if (!isMember) return Forbid("You are not a member of this server.");
        if (!hasPermission) return Forbid("You do not have permission to read the message history in this channel.");

        if (limit is < 1 or > 100) limit = 50;

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        IQueryable<Message> query = dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == channelId && m.ModerationStatus == ModerationStatus.Visible)
            .Include(m => m.Sender);

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
                CreatedAt = m.CreatedAt,
                EditedAt = m.EditedAt
            })
            .ToListAsync(cancellationToken);

        messages.Reverse();
        return Ok(messages);
    }

    // GET /channels/{channelId}/messages/{messageId} - Specifikus üzenet lekérése
    [HttpGet("{messageId}")]
    public async Task<IActionResult> GetMessage(long channelId, long messageId, CancellationToken cancellationToken)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var (isMember, hasPermission, _) = await CheckPermissionsForChannel(channelId, userId, Permission.ReadMessageHistory, cancellationToken);
        
        if (!isMember) return Forbid("You are not a member of this server.");
        if (!hasPermission) return Forbid("You do not have permission to view messages in this channel.");
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var message = await dbContext.Messages
            .AsNoTracking()
            .Include(m => m.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
            
        if (message == null) return NotFound("Message not found.");

        return Ok(new MessageDtos.MessageDetailDto
        {
            Id = message.Id,
            ChannelId = message.ChannelId,
            UserId = message.SenderId,
            Username = message.Sender!.Username,
            Content = message.Content,
            CreatedAt = message.CreatedAt,
            EditedAt = message.EditedAt
        });
    }

    // PATCH /channels/{channelId}/messages/{messageId} - Üzenet szerkesztése
    [HttpPatch("{messageId}")]
    public async Task<IActionResult> EditMessage(long channelId, long messageId, [FromBody] MessageDtos.UpdateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
    
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
    
        var message = await dbContext.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        if (message == null) return NotFound("Message not found.");
    
        // Üzenetet csak a saját szerzője szerkeszthet. Ez a logika marad.
        if (message.SenderId != userId)
        {
            return Forbid("You can only edit your own messages.");
        }
    
        message.Content = request.Content;
        message.EditedAt = SystemClock.Instance.GetCurrentInstant();
    
        await dbContext.SaveChangesAsync(cancellationToken);
    
        return NoContent();
    }

    // DELETE /channels/{channelId}/messages/{messageId} - Üzenet törlése
    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(long channelId, long messageId, CancellationToken cancellationToken)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        if (message == null) return NotFound("Message not found.");

        // Ellenőrizzük, hogy a felhasználónak van-e joga mások üzenetét törölni.
        var (isMember, hasManageMessagesPermission, _) = await CheckPermissionsForChannel(channelId, userId, Permission.ManageMessages, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server.");
        }

        // A törlést engedélyezzük, ha:
        // 1. A felhasználó a saját üzenetét törli.
        // 2. A felhasználónak van 'ManageMessages' jogosultsága.
        if (message.SenderId != userId && !hasManageMessagesPermission)
        {
            return Forbid("You can only delete your own messages or you need permissions.");
        }
        
        // A "soft delete" logika változatlan marad, ami jó gyakorlat.
        message.ModerationStatus = message.SenderId == userId 
            ? ModerationStatus.UserDeleted 
            : ModerationStatus.ModeratedRemoved;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}