using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Microsoft.AspNetCore.SignalR;
using Dumcsi.Backend.Hubs;
using Dumcsi.Backend.Services.Data;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/dm/{targetUserId}/messages")]
public class DmMessageController(IDbContextFactory<DumcsiDbContext> dbContextFactory, IHubContext<ChatHub> hubContext, IFileStorageService fileStorageService)
    : BaseApiController(dbContextFactory)
{
    [HttpPost("~/api/dm/{targetUserId}/attachments")]
    public async Task<IActionResult> UploadDmAttachment(long targetUserId, IFormFile? file)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync();

        var targetUser = await dbContext.Users.FindAsync(targetUserId);
        var currentUser = await dbContext.Users.FindAsync(CurrentUserId);
        if (targetUser == null || currentUser == null)
        {
            return NotFound(ApiResponse.Fail("DM_USER_NOT_FOUND", "User not found"));
        }

        // Block check
        var isBlocked = await dbContext.Set<BlockedUser>().AnyAsync(b =>
            (b.BlockerId == CurrentUserId && b.BlockedId == targetUserId) ||
            (b.BlockerId == targetUserId && b.BlockedId == CurrentUserId));
        if (isBlocked)
        {
            return StatusCode(403, ApiResponse.Fail("DM_BLOCKED", "Cannot upload attachment for blocked conversation"));
        }

        // Enforce recipient's DM filter settings (same as SendMessage)
        var areFriends = await dbContext.Friendships.AnyAsync(f =>
            (f.User1Id == CurrentUserId && f.User2Id == targetUserId) ||
            (f.User2Id == CurrentUserId && f.User1Id == targetUserId));

        var hasAcceptedRequest = await dbContext.DmRequests.AnyAsync(r =>
            ((r.FromUserId == CurrentUserId && r.ToUserId == targetUserId) ||
             (r.FromUserId == targetUserId && r.ToUserId == CurrentUserId)) &&
            r.Status == DmRequestStatus.Accepted);

        var recipientFilter = await dbContext.DmSettings
            .Where(s => s.UserId == targetUserId)
            .Select(s => s.FilterOption)
            .FirstOrDefaultAsync();

        switch (recipientFilter)
        {
            case DmFilterOption.AllowAll:
                break;
            case DmFilterOption.FriendsOnly:
                if (!areFriends && !hasAcceptedRequest)
                {
                    return StatusCode(403, ApiResponse.Fail("DM_NOT_FRIENDS", "Recipient accepts DMs from friends only"));
                }
                break;
            case DmFilterOption.AllRequests:
            default:
                return StatusCode(403, ApiResponse.Fail("DM_DISABLED", "Recipient does not accept DMs"));
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse.Fail("ATTACHMENT_FILE_MISSING", "No file was uploaded."));
        }

        if (file.Length > 50 * 1024 * 1024)
        {
            return BadRequest(ApiResponse.Fail("ATTACHMENT_FILE_TOO_LARGE", "File size cannot exceed 50MB."));
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var fileUrl = await fileStorageService.UploadFileAsync(stream, file.FileName, file.ContentType);

            var attachment = new Attachment
            {
                FileName = file.FileName,
                FileUrl = fileUrl,
                FileSize = (int)file.Length,
                ContentType = file.ContentType
            };

            dbContext.Attachments.Add(attachment);
            await dbContext.SaveChangesAsync();

            var attachmentDto = new MessageDtos.AttachmentDto
            {
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
    [HttpPost]
    public async Task<IActionResult> SendMessage(long targetUserId, [FromBody] DmMessageDtos.SendDmMessageRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("DM_INVALID", "Invalid request"));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var targetUser = await dbContext.Users.FindAsync(targetUserId);
        var currentUser = await dbContext.Users.FindAsync(CurrentUserId);
        if (targetUser == null || currentUser == null)
        {
            return NotFound(ApiResponse.Fail("DM_USER_NOT_FOUND", "User not found"));
        }

        var areFriends = await dbContext.Friendships.AnyAsync(f =>
            (f.User1Id == CurrentUserId && f.User2Id == targetUserId) ||
            (f.User2Id == CurrentUserId && f.User1Id == targetUserId), cancellationToken);

        var hasAcceptedRequest = await dbContext.DmRequests.AnyAsync(r =>
            ((r.FromUserId == CurrentUserId && r.ToUserId == targetUserId) ||
             (r.FromUserId == targetUserId && r.ToUserId == CurrentUserId)) &&
            r.Status == DmRequestStatus.Accepted, cancellationToken);

        // Block check
        var isBlocked = await dbContext.Set<BlockedUser>().AnyAsync(b =>
            (b.BlockerId == CurrentUserId && b.BlockedId == targetUserId) ||
            (b.BlockerId == targetUserId && b.BlockedId == CurrentUserId), cancellationToken);

        if (isBlocked)
        {
            return StatusCode(403, ApiResponse.Fail("DM_BLOCKED", "Cannot message blocked user"));
        }

        // Enforce recipient's DM filter settings in all cases (even if friends)
        var recipientFilter = await dbContext.DmSettings
            .Where(s => s.UserId == targetUserId)
            .Select(s => s.FilterOption)
            .FirstOrDefaultAsync(cancellationToken);

        switch (recipientFilter)
        {
            case DmFilterOption.AllowAll:
                // Allowed: continue
                break;
            case DmFilterOption.FriendsOnly:
                if (!areFriends && !hasAcceptedRequest)
                {
                    return StatusCode(403, ApiResponse.Fail("DM_NOT_FRIENDS", "Recipient accepts DMs from friends only"));
                }
                break;
            case DmFilterOption.AllRequests:
            default:
                // Treat as "No one" (block all DMs regardless of friendship)
                return StatusCode(403, ApiResponse.Fail("DM_DISABLED", "Recipient does not accept DMs"));
        }

        var message = new DmMessage
        {
            SenderId = CurrentUserId,
            ReceiverId = targetUserId,
            Sender = currentUser,
            Receiver = targetUser,
            Content = request.Content,
            Timestamp = SystemClock.Instance.GetCurrentInstant(),
            Tts = request.Tts
        };

        // Handle attachments
        if (request.AttachmentIds != null && request.AttachmentIds.Any())
        {
            message.Attachments = await dbContext.Attachments
                .Where(a => request.AttachmentIds.Contains(a.Id))
                .ToListAsync(cancellationToken);
        }

        // Handle user mentions
        if (request.MentionedUserIds != null && request.MentionedUserIds.Any())
        {
            message.MentionUsers = await dbContext.Users
                .Where(u => request.MentionedUserIds.Contains(u.Id))
                .ToListAsync(cancellationToken);
        }

        dbContext.DmMessages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new DmMessageDtos.DmMessageDto
        {
            Id = message.Id,
            SenderId = message.SenderId,
            ReceiverId = message.ReceiverId,
            Sender = new UserDtos.UserProfileDto
            {
                Id = currentUser.Id,
                Username = currentUser.Username,
                GlobalNickname = currentUser.GlobalNickname,
                Email = currentUser.Email,
                Avatar = currentUser.Avatar,
                Locale = currentUser.Locale,
                Verified = currentUser.Verified
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
                Email = u.Email,
                Avatar = u.Avatar,
                Locale = u.Locale,
                Verified = u.Verified
            }).ToList(),
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
            }).ToList()
        };

        // Send real-time notifications to both users
        await hubContext.Clients.User(CurrentUserId.ToString()).SendAsync("DmMessageReceived", dto, cancellationToken);
        await hubContext.Clients.User(targetUserId.ToString()).SendAsync("DmMessageReceived", dto, cancellationToken);

        return OkResponse(dto, "Message sent");
    }

    [HttpGet]
    public async Task<IActionResult> GetMessages(long targetUserId, [FromQuery] long? before = null,
        [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        if (limit is < 1 or > 100) limit = 50;

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        IQueryable<DmMessage> query = dbContext.DmMessages
            .Where(m =>
                (m.SenderId == CurrentUserId && m.ReceiverId == targetUserId) ||
                (m.SenderId == targetUserId && m.ReceiverId == CurrentUserId))
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.MentionUsers)
            .OrderByDescending(m => m.Id);

        if (before.HasValue)
        {
            query = query.Where(m => m.Id < before.Value);
        }

        var messages = await query.Take(limit).ToListAsync(cancellationToken);
        var dtos = messages.Select(m => new DmMessageDtos.DmMessageDto
        {
            Id = m.Id,
            SenderId = m.SenderId,
            ReceiverId = m.ReceiverId,
            Sender = new UserDtos.UserProfileDto
            {
                Id = m.Sender.Id,
                Username = m.Sender.Username,
                GlobalNickname = m.Sender.GlobalNickname,
                Email = m.Sender.Email,
                Avatar = m.Sender.Avatar,
                Locale = m.Sender.Locale,
                Verified = m.Sender.Verified
            },
            Content = m.Content,
            Timestamp = m.Timestamp,
            EditedTimestamp = m.EditedTimestamp,
            Tts = m.Tts ?? false,
            Mentions = m.MentionUsers.Select(u => new UserDtos.UserProfileDto
            {
                Id = u.Id,
                Username = u.Username,
                GlobalNickname = u.GlobalNickname,
                Email = u.Email,
                Avatar = u.Avatar,
                Locale = u.Locale,
                Verified = u.Verified
            }).ToList(),
            Attachments = m.Attachments.Select(a => new MessageDtos.AttachmentDto
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
            }).ToList()
        }).Reverse().ToList();

        return OkResponse(dtos);
    }

    [HttpPut("{messageId}")]
    public async Task<IActionResult> EditMessage(long targetUserId, long messageId, [FromBody] DmMessageDtos.UpdateDmMessageRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("DM_INVALID_DATA", "The provided message data is invalid."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var message = await dbContext.DmMessages
            .Where(m =>
                ((m.SenderId == CurrentUserId && m.ReceiverId == targetUserId) ||
                 (m.SenderId == targetUserId && m.ReceiverId == CurrentUserId)) &&
                m.Id == messageId)
            .FirstOrDefaultAsync(cancellationToken);

        if (message == null)
        {
            return NotFound(ApiResponse.Fail("DM_MESSAGE_NOT_FOUND", "Message not found."));
        }

        if (message.SenderId != CurrentUserId)
        {
            return StatusCode(403, ApiResponse.Fail("DM_MESSAGE_EDIT_FORBIDDEN", "You can only edit your own messages."));
        }

        message.Content = request.Content;
        message.EditedTimestamp = SystemClock.Instance.GetCurrentInstant();

        await dbContext.SaveChangesAsync(cancellationToken);

        // Send real-time update notifications to both users  
        var updatePayload = new { 
            messageId = messageId, 
            content = message.Content, 
            editedTimestamp = message.EditedTimestamp?.ToString() 
        };
        await hubContext.Clients.User(CurrentUserId.ToString()).SendAsync("DmMessageUpdated", updatePayload, cancellationToken);
        await hubContext.Clients.User(targetUserId.ToString()).SendAsync("DmMessageUpdated", updatePayload, cancellationToken);

        return OkResponse<object?>(null, "Message updated successfully.");
    }

    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(long targetUserId, long messageId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var message = await dbContext.DmMessages
            .Where(m =>
                ((m.SenderId == CurrentUserId && m.ReceiverId == targetUserId) ||
                 (m.SenderId == targetUserId && m.ReceiverId == CurrentUserId)) &&
                m.Id == messageId)
            .FirstOrDefaultAsync(cancellationToken);

        if (message == null)
        {
            return NotFound(ApiResponse.Fail("DM_MESSAGE_NOT_FOUND", "Message not found."));
        }

        if (message.SenderId != CurrentUserId)
        {
            return StatusCode(403, ApiResponse.Fail("DM_MESSAGE_DELETE_FORBIDDEN", "You can only delete your own messages."));
        }

        dbContext.DmMessages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Send real-time deletion notifications to both users
        var deletePayload = new { messageId = messageId };
        await hubContext.Clients.User(CurrentUserId.ToString()).SendAsync("DmMessageDeleted", deletePayload, cancellationToken);
        await hubContext.Clients.User(targetUserId.ToString()).SendAsync("DmMessageDeleted", deletePayload, cancellationToken);

        return OkResponse<object?>(null, "Message deleted successfully.");
    }

    [HttpGet("/api/dm/conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var messagesQuery = dbContext.DmMessages
            .Where(m => m.SenderId == CurrentUserId || m.ReceiverId == CurrentUserId)
            .Select(m => new
            {
                OtherUserId = m.SenderId == CurrentUserId ? m.ReceiverId : m.SenderId,
                Message = m
            });

        var grouped = await messagesQuery
            .GroupBy(x => x.OtherUserId)
            .Select(g => g.OrderByDescending(x => x.Message.Timestamp).First())
            .ToListAsync(cancellationToken);

        var dtos = grouped
            .Join(dbContext.Users, g => g.OtherUserId, u => u.Id, (g, u) => new DmMessageDtos.ConversationListItemDto
            {
                UserId = u.Id,
                Username = u.Username,
                LastMessage = g.Message.Content,
                LastTimestamp = g.Message.Timestamp
            })
            .OrderByDescending(d => d.LastTimestamp)
            .ToList();

        return OkResponse(dtos);
    }
}
