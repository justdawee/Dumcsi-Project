using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Dumcsi.Backend.Services.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/messages")] // Global message search
public class MessageSearchController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IPermissionService permissionService
) : BaseApiController(dbContextFactory)
{
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] long? serverId,
        [FromQuery] long? channelId,
        [FromQuery] long? authorId,
        [FromQuery] string? q,
        [FromQuery] string? has, // link|embed|file
        [FromQuery] string? before,
        [FromQuery] string? after,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default
    )
    {
        if (limit is < 1 or > 100) limit = 50;

        await using var db = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        // Validate permissions depending on filter scope
        if (channelId.HasValue)
        {
            var (isMember, hasHistory) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId.Value, Permission.ReadMessageHistory);
            if (!isMember)
                return StatusCode(403, ApiResponse.Fail("MESSAGE_SEARCH_FORBIDDEN", "You are not a member of this server."));
            if (!hasHistory)
                return StatusCode(403, ApiResponse.Fail("MESSAGE_SEARCH_FORBIDDEN_HISTORY", "You do not have permission to read message history in this channel."));
        }
        else if (serverId.HasValue)
        {
            var canRead = await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId.Value, Permission.ReadMessageHistory);
            if (!canRead)
                return StatusCode(403, ApiResponse.Fail("MESSAGE_SEARCH_FORBIDDEN_SERVER", "You do not have permission to read message history in this server."));
        }

        IQueryable<Message> query = db.Messages
            .AsNoTracking()
            .Include(m => m.Author)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .Include(m => m.Channel)
            .ThenInclude(c => c.Server);

        // Scope filters
        if (channelId.HasValue)
        {
            query = query.Where(m => m.ChannelId == channelId.Value);
        }
        else if (serverId.HasValue)
        {
            query = query.Where(m => m.Channel.ServerId == serverId.Value);
        }
        else
        {
            // Default: restrict to servers where the user is a member
            query = query.Where(m => m.Channel.Server!.Members.Any(sm => sm.UserId == CurrentUserId));
        }

        // Author filter
        if (authorId.HasValue)
            query = query.Where(m => m.SenderId == authorId.Value);

        // Content filter
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(m => EF.Functions.Like(m.Content.ToLower(), $"%{term}%"));
        }

        // Has filter
        if (!string.IsNullOrWhiteSpace(has))
        {
            var normalized = has.Trim().ToLower();
            var wantsFile = normalized.Contains("file");
            var wantsLinkOrEmbed = normalized.Contains("link") || normalized.Contains("embed");

            if (wantsFile)
                query = query.Where(m => m.Attachments.Any());

            if (wantsLinkOrEmbed)
                query = query.Where(m => m.Content.Contains("http://") || m.Content.Contains("https://"));
        }

        // Date range filter
        if (!string.IsNullOrWhiteSpace(before))
        {
            if (InstantPattern(before, out var beforeInstant))
            {
                query = query.Where(m => m.Timestamp < beforeInstant);
            }
        }

        if (!string.IsNullOrWhiteSpace(after))
        {
            if (InstantPattern(after, out var afterInstant))
            {
                query = query.Where(m => m.Timestamp > afterInstant);
            }
        }

        // Order by newest first
        query = query.OrderByDescending(m => m.Timestamp);

        var messages = await query.Take(limit).ToListAsync(cancellationToken);

        var dtos = messages.Select(MapMessageToDto).ToList();
        return OkResponse(dtos);
    }

    private static bool InstantPattern(string value, out Instant instant)
    {
        // Accept ISO 8601 or date-only; default date-only to 00:00Z
        if (DateTimeOffset.TryParse(value, out var dto))
        {
            instant = Instant.FromDateTimeOffset(dto);
            return true;
        }
        if (DateTime.TryParse(value, out var dt))
        {
            var dto2 = new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
            instant = Instant.FromDateTimeOffset(dto2);
            return true;
        }
        instant = default;
        return false;
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

