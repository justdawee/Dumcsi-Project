using Dumcsi.Api.Common;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/dm/{targetUserId}/messages")]
public class DmMessageController(IDbContextFactory<DumcsiDbContext> dbContextFactory)
    : BaseApiController(dbContextFactory)
{
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
            r.Status == Dumcsi.Domain.Enums.DmRequestStatus.Accepted, cancellationToken);

        if (!areFriends && !hasAcceptedRequest)
        {
            return StatusCode(403, ApiResponse.Fail("DM_FORBIDDEN", "No permission to message this user"));
        }

        var message = new DmMessage
        {
            SenderId = CurrentUserId,
            ReceiverId = targetUserId,
            Sender = currentUser,
            Receiver = targetUser,
            Content = request.Content,
            Timestamp = SystemClock.Instance.GetCurrentInstant()
        };

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
            EditedTimestamp = message.EditedTimestamp
        };

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
            EditedTimestamp = m.EditedTimestamp
        }).Reverse().ToList();

        return OkResponse(dtos);
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