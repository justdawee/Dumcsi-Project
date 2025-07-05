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
[Route("api/channels/{channelId}/messages")]
public class MessageController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService)
    : BaseApiController(dbContextFactory)
{
    [HttpPost]
    public async Task<IActionResult> SendMessage(long channelId, [FromBody] MessageDtos.CreateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequestResponse("Invalid request data.");

        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, channelId, Permission.SendMessages);
        if (!isMember) return ForbidResponse("You are not a member of this server.");
        if (!hasPermission) return ForbidResponse("You do not have permission to send messages in this channel.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var channel = await dbContext.Channels.Include(c => c.Server).FirstOrDefaultAsync(c => c.Id == channelId, cancellationToken);
        var author = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);

        if (channel == null || author == null)
        {
            return NotFoundResponse("Channel or user not found.");
        }

        var message = new Message
        {
            Channel = channel,
            Author = author,
            Content = request.Content,
            Timestamp = SystemClock.Instance.GetCurrentInstant(),
            Tts = request.Tts
        };

        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        var messageDto = MapMessageToDto(message);
        
        return OkResponse(messageDto, "Message sent successfully.");
    }

    [HttpGet]
    public async Task<IActionResult> GetMessages(long channelId, [FromQuery] long? before = null, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, channelId, Permission.ReadMessageHistory);
        if (!isMember) return ForbidResponse("You are not a member of this server.");
        if (!hasPermission) return ForbidResponse("You do not have permission to read the message history in this channel.");

        if (limit is < 1 or > 100) limit = 50;

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        IQueryable<Message> query = dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == channelId)
            .Include(m => m.Author)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .OrderByDescending(m => m.Id);

        if (before.HasValue)
        {
            query = query.Where(m => m.Id < before.Value);
        }

        var messages = await query.Take(limit).ToListAsync(cancellationToken);
        var messageDtos = messages.Select(MapMessageToDto).Reverse().ToList();

        return OkResponse(messageDtos);
    }
    
    [HttpPatch("{messageId}")]
    public async Task<IActionResult> EditMessage(long channelId, long messageId, [FromBody] MessageDtos.UpdateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequestResponse("Invalid request data.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages
            .Include(m => m.Channel).Include(message => message.Author!)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
            
        if (message == null) return NotFoundResponse("Message not found.");
        
        if (message.Author!.Id != CurrentUserId)
        {
            return ForbidResponse("You can only edit your own messages.");
        }
        
        var oldContent = message.Content;
        message.Content = request.Content;
        message.EditedTimestamp = SystemClock.Instance.GetCurrentInstant();
        
        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(
            message.Channel.ServerId,
            CurrentUserId,
            AuditLogActionType.MessageEdited,
            message.Id,
            AuditLogTargetType.User, // A cél a User, aki az üzenetet írta
            new { OldContent = oldContent, NewContent = message.Content }
        );

        return OkResponse("Message updated successfully.");
    }

    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(long channelId, long messageId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var message = await dbContext.Messages
            .Include(m => m.Channel)
            .Include(m => m.Author)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
            
        if (message == null) return NotFoundResponse("Message not found.");

        var (isMember, hasManageMessagesPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, channelId, Permission.ManageMessages);
        
        if (!isMember) return ForbidResponse();
        if (message.Author!.Id != CurrentUserId && !hasManageMessagesPermission)
        {
            return ForbidResponse("You can only delete your own messages or you need permission.");
        }
        
        var deletedContent = message.Content; // Naplózáshoz elmentjük
        dbContext.Messages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(
            message.Channel.ServerId,
            CurrentUserId,
            AuditLogActionType.MessageDeleted,
            messageId,
            AuditLogTargetType.User,
            new { DeletedContent = deletedContent, Author = message.Author!.Username }
        );

        return OkResponse("Message deleted successfully.");
    }
    
    // --- Segédmetódus ---
    private MessageDtos.MessageDto MapMessageToDto(Message message)
    {
        return new MessageDtos.MessageDto
        {
            Id = message.Id,
            ChannelId = message.ChannelId,
            Author = new UserDtos.UserProfileDto
            {
                Id = message.Author!.Id,
                Username = message.Author.Username,
                GlobalNickname = message.Author.GlobalNickname,
                Avatar = message.Author.Avatar
            },
            Content = message.Content,
            Timestamp = message.Timestamp,
            EditedTimestamp = message.EditedTimestamp,
            Tts = message.Tts ?? false,
            Attachments = message.Attachments.Select(a => new MessageDtos.AttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                Height = a.height,
                Width = a.width,
                Duration = a.duration,
                Waveform = a.Waveform
            }).ToList(),
            Reactions = message.Reactions.GroupBy(r => r.EmojiId)
                .Select(g => new MessageDtos.ReactionDto
                {
                    EmojiId = g.Key,
                    Count = g.Count(),
                    Me = g.Any(r => r.UserId == CurrentUserId) 
                }).ToList()
        };
    }
}