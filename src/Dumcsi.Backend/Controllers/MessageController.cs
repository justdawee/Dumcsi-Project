using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Hubs;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Dumcsi.Backend.Services.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/channels/{channelId}/messages")]
public class MessageController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IPermissionService permissionService,
    IFileStorageService fileStorageService,
    IHubContext<ChatHub> chatHubContext)
    : BaseApiController(dbContextFactory)
{
    [HttpPost]
    public async Task<IActionResult> SendMessage(long channelId, [FromBody] MessageDtos.CreateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) 
        {
            return BadRequest(ApiResponse.Fail("MESSAGE_INVALID_DATA", "The provided message data is invalid."));
        }

        var (isMember, hasPermission) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.SendMessages);
        if (!isMember) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_ACCESS_DENIED", "You are not a member of this server."));
        }
        if (!hasPermission) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_SEND", "You do not have permission to send messages in this channel."));
        }
        
        if (request.MentionedRoleIds != null && request.MentionedRoleIds.Any())
        {
            var (member, permission) = await permissionService.GetPermissionsForChannelAsync(CurrentUserId, channelId);
            if (!member || !permission.HasFlag(Permission.MentionEveryone))
            {
                return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_MENTION_ROLES", "You do not have permission to mention roles in this channel."));
            }
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels.Include(c => c.Server).FirstOrDefaultAsync(c => c.Id == channelId, cancellationToken);
        var author = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (channel == null || author == null) 
        {
            return NotFound(ApiResponse.Fail("MESSAGE_SEND_PREREQUISITES_NOT_FOUND", "Channel or author user not found."));
        }

        var message = new Message
        {
            Channel = channel,
            Author = author,
            Content = request.Content,
            Timestamp = SystemClock.Instance.GetCurrentInstant(),
            Tts = request.Tts
        };
        
        if (request.AttachmentIds != null && request.AttachmentIds.Any())
        {
            message.Attachments = await dbContext.Attachments
                .Where(a => request.AttachmentIds.Contains(a.Id))
                .ToListAsync(cancellationToken);
        }
        
        if (request.MentionedUserIds != null && request.MentionedUserIds.Any())
        {
            message.MentionUsers = await dbContext.Users
                .Where(u => request.MentionedUserIds.Contains(u.Id))
                .ToListAsync(cancellationToken);
        }
        
        if (request.MentionedRoleIds != null && request.MentionedRoleIds.Any())
        {
            var mentionedRoles = await dbContext.Roles
                .Where(r => r.ServerId == channel.ServerId && request.MentionedRoleIds.Contains(r.Id))
                .ToListAsync(cancellationToken);
            
            var (_, permissions) = await permissionService.GetPermissionsForChannelAsync(CurrentUserId, channelId);
            if (!permissions.HasFlag(Permission.MentionEveryone))
            {
                foreach (var role in mentionedRoles.Where(role => !role.IsMentionable))
                {
                    return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_MENTION_NOT_MENTIONABLE", $"You do not have permission to mention the '{role.Name}' role."));
                }
            }
            message.MentionRoles = mentionedRoles;
        }

        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        var messageDto = MapMessageToDto(message);
        
        await chatHubContext.Clients
            .Group(channelId.ToString())
            .SendAsync("ReceiveMessage", messageDto, cancellationToken);

        return CreatedAtAction(nameof(GetMessages), new { channelId }, ApiResponse<MessageDtos.MessageDto>.Success(messageDto, "Message sent successfully."));
    }

    [HttpGet]
    public async Task<IActionResult> GetMessages(long channelId, [FromQuery] long? before = null, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var (isMember, hasPermission) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.ReadMessageHistory);
        if (!isMember) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_ACCESS_DENIED", "You are not a member of this server."));
        }
        if (!hasPermission) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_READ_HISTORY", "You do not have permission to read the message history in this channel."));
        }

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
        var (isMember, hasPermission) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.ReadMessageHistory);
        if (!isMember) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_ACCESS_DENIED", "You are not a member of this server."));
        }
        if (!hasPermission) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_READ_HISTORY", "You do not have permission to read the message history in this channel."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var targetMessage = await dbContext.Messages.FindAsync([messageId], cancellationToken);
        if (targetMessage == null || targetMessage.ChannelId != channelId)
        {
            return NotFound(ApiResponse.Fail("MESSAGE_NOT_FOUND", "The target message does not exist in this channel."));
        }

        var messagesBefore = await dbContext.Messages.Where(m => m.ChannelId == channelId && m.Id < messageId).OrderByDescending(m => m.Id).Take(limit / 2).ToListAsync(cancellationToken);
        var messagesAfter = await dbContext.Messages.Where(m => m.ChannelId == channelId && m.Id > messageId).OrderBy(m => m.Id).Take(limit / 2).ToListAsync(cancellationToken);

        var allMessages = messagesBefore.OrderBy(m => m.Id).Append(targetMessage).Concat(messagesAfter).ToList();
        
        var messageIds = allMessages.Select(m => m.Id).ToList();
        var fullMessages = await dbContext.Messages.AsNoTracking().Where(m => messageIds.Contains(m.Id)).Include(m => m.Author).Include(m => m.Attachments).Include(m => m.Reactions).OrderBy(m => m.Id).ToListAsync(cancellationToken);
            
        var messageDtos = fullMessages.Select(MapMessageToDto).ToList();

        return OkResponse(messageDtos);
    }
    
    [HttpPatch("{messageId}")]
    public async Task<IActionResult> EditMessage(long channelId, long messageId, [FromBody] MessageDtos.UpdateMessageRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) 
        {
            return BadRequest(ApiResponse.Fail("MESSAGE_UPDATE_INVALID_DATA", "The provided data for updating the message is invalid."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
    
        var message = await dbContext.Messages.Include(m => m.Channel).Include(m => m.Author!).Include(m => m.Attachments).Include(m => m.Reactions).FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        
        if (message == null) 
        {
            return NotFound(ApiResponse.Fail("MESSAGE_NOT_FOUND", "The message to edit does not exist."));
        }
    
        if (message.Author!.Id != CurrentUserId)
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_EDIT", "You can only edit your own messages."));
        }
    
        var oldContent = message.Content;
        message.Content = request.Content;
        message.EditedTimestamp = SystemClock.Instance.GetCurrentInstant();
    
        await dbContext.SaveChangesAsync(cancellationToken);
    
        await auditLogService.LogAsync(message.Channel.ServerId, CurrentUserId, AuditLogActionType.MessageEdited, message.Id, AuditLogTargetType.User, new { OldContent = oldContent, NewContent = message.Content });
        
        var updatedMessageDto = MapMessageToDto(message);
        await chatHubContext.Clients.Group(channelId.ToString()).SendAsync("MessageUpdated", updatedMessageDto, cancellationToken);

        return OkResponse("Message updated successfully.");
    }

    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(long channelId, long messageId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var message = await dbContext.Messages.Include(m => m.Channel).Include(m => m.Author).FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        
        if (message == null) 
        {
            return NotFound(ApiResponse.Fail("MESSAGE_NOT_FOUND", "The message to delete does not exist."));
        }

        var (isMember, hasManageMessagesPermission) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.ManageMessages);
    
        if (!isMember) 
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_ACCESS_DENIED", "You are not a member of this server."));
        }
        if (message.Author!.Id != CurrentUserId && !hasManageMessagesPermission)
        {
            return StatusCode(403, ApiResponse.Fail("MESSAGE_FORBIDDEN_DELETE", "You can only delete your own messages or you need 'Manage Messages' permission."));
        }
    
        var deletedContent = message.Content;
        var serverId = message.Channel.ServerId;
        var authorUsername = message.Author!.Username;

        dbContext.Messages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.MessageDeleted, messageId, AuditLogTargetType.User, new { DeletedContent = deletedContent, Author = authorUsername });
    
        await chatHubContext.Clients.Group(channelId.ToString()).SendAsync("MessageDeleted", new { ChannelId = channelId, MessageId = messageId }, cancellationToken);

        return OkResponse("Message deleted successfully.");
    }
    
    [HttpPost("~/api/channels/{channelId}/attachments")]
    public async Task<IActionResult> UploadAttachment(long channelId, IFormFile? file)
    {
        var (isMember, hasPermission) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.AttachFiles);
        if (!isMember) 
        {
            return StatusCode(403, ApiResponse.Fail("ATTACHMENT_ACCESS_DENIED", "You are not a member of this server."));
        }
        if (!hasPermission) 
        {
            return StatusCode(403, ApiResponse.Fail("ATTACHMENT_FORBIDDEN_UPLOAD", "You do not have permission to attach files in this channel."));
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse.Fail("ATTACHMENT_FILE_MISSING", "No file was uploaded."));
        }

        if (file.Length > 50 * 1024 * 1024) // max 50MB
        {
            return BadRequest(ApiResponse.Fail("ATTACHMENT_FILE_TOO_LARGE", "File size cannot exceed 50MB."));
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var fileUrl = await fileStorageService.UploadFileAsync(stream, file.FileName, file.ContentType);

            await using var dbContext = await DbContextFactory.CreateDbContextAsync();
            var attachment = new Attachment
            {
                FileName = file.FileName,
                FileUrl = fileUrl,
                FileSize = (int)file.Length,
                ContentType = file.ContentType
            };

            dbContext.Attachments.Add(attachment);
            await dbContext.SaveChangesAsync();
            
            var attachmentDto = new MessageDtos.AttachmentDto {
                Id = attachment.Id,
                FileName = attachment.FileName,
                FileUrl = attachment.FileUrl,
                FileSize = attachment.FileSize,
                ContentType = attachment.ContentType
            };
            
            return OkResponse(attachmentDto);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse.Fail("ATTACHMENT_UPLOAD_ERROR", $"An error occurred during file upload: {ex.Message}"));
        }
    }
    
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
            Mentions = message.MentionUsers.Select(u => new UserDtos.UserProfileDto
            {
                Id = u.Id,
                Username = u.Username,
                GlobalNickname = u.GlobalNickname,
                Avatar = u.Avatar
            }).ToList(),
            MentionRoleIds = message.MentionRoles.Select(r => r.Id).ToList(),
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
