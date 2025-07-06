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

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/channels/{channelId}/messages")]
public class MessageController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IHubContext<ChatHub> chatHubContext)
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
        
        // Üzenet szétküldése a SignalR Hub-on keresztül
        await chatHubContext.Clients
            .Group(channelId.ToString())
            .SendAsync("ReceiveMessage", messageDto, cancellationToken);
        
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
    
    [HttpGet("{messageId}/context")]
    public async Task<IActionResult> GetMessageContext(long channelId, long messageId, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, channelId, Permission.ReadMessageHistory);
        if (!isMember) return ForbidResponse("You are not a member of this server.");
        if (!hasPermission) return ForbidResponse("You do not have permission to read the message history in this channel.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        // 1. Lekérdezzük az X üzenetet a fókuszban lévő üzenet ELŐTT
        var messagesBefore = await dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == channelId && m.Id < messageId)
            .OrderByDescending(m => m.Id)
            .Take(limit / 2)
            .ToListAsync(cancellationToken);

        // 2. Lekérdezzük a fókuszban lévő üzenetet
        var targetMessage = await dbContext.Messages
            .AsNoTracking()
            .Include(m => m.Author)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .FirstOrDefaultAsync(m => m.Id == messageId, cancellationToken);
            
        if (targetMessage == null)
        {
            return NotFoundResponse("The target message does not exist.");
        }

        // 3. Lekérdezzük az Y üzenetet a fókuszban lévő üzenet UTÁN
        var messagesAfter = await dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == channelId && m.Id > messageId)
            .OrderBy(m => m.Id)
            .Take(limit / 2)
            .ToListAsync(cancellationToken);

        // 4. Összefűzzük és sorba rendezzük a listákat
        var allMessages = messagesBefore.OrderBy(m => m.Id) // A "before" listát visszafordítjuk
            .Concat(new[] { targetMessage })
            .Concat(messagesAfter)
            .ToList();

        // Minden üzenethez betöltjük a szükséges adatokat
        // (Ezt egy optimalizáltabb lekérdezéssel is meg lehetne oldani, de így a legolvashatóbb)
        var messageIds = allMessages.Select(m => m.Id).ToList();
        var fullMessages = await dbContext.Messages
            .AsNoTracking()
            .Where(m => messageIds.Contains(m.Id))
            .Include(m => m.Author)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .OrderBy(m => m.Id)
            .ToListAsync(cancellationToken);
            
        var messageDtos = fullMessages.Select(MapMessageToDto).ToList();

        return OkResponse(messageDtos);
    }
    
    [HttpPatch("{messageId}")]
    public async Task<IActionResult> EditMessage(long channelId, long messageId, [FromBody] MessageDtos.UpdateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequestResponse("Invalid request data.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
    
        // Azért kell az Author is, hogy a MapMessageToDto működjön
        var message = await dbContext.Messages
            .Include(m => m.Channel)
            .Include(m => m.Author!)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
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
            AuditLogActionType.ChannelUpdated, // Vagy egy új MessageEdited típus
            message.Id,
            AuditLogTargetType.User,
            new { OldContent = oldContent, NewContent = message.Content }
        );
        
        // Üzenet frissítése a SignalR Hub-on keresztül
        var updatedMessageDto = MapMessageToDto(message); // A frissített adatokat küldjük ki
        await chatHubContext.Clients
            .Group(channelId.ToString())
            .SendAsync("MessageUpdated", updatedMessageDto, cancellationToken);

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
    
        var deletedContent = message.Content;
        var serverId = message.Channel.ServerId; // Mentsük el a törlés előtt
        var authorUsername = message.Author!.Username;

        dbContext.Messages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    
        await auditLogService.LogAsync(
            serverId,
            CurrentUserId,
            AuditLogActionType.ChannelUpdated, // Vagy egy új MessageDeleted típus
            messageId,
            AuditLogTargetType.User,
            new { DeletedContent = deletedContent, Author = authorUsername }
        );
    
        // Üzenet törlése a SignalR Hub-on keresztül
        await chatHubContext.Clients
            .Group(channelId.ToString())
            .SendAsync("MessageDeleted", new { ChannelId = channelId, MessageId = messageId }, cancellationToken);

        return OkResponse("Message deleted successfully.");
    }
    
    // --- Mapper ---
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