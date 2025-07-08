using System.Net;
using Dumcsi.Api.Common;
using Dumcsi.Api.Hubs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/channels/{channelId}/messages/{messageId}/reactions")]
public class ReactionController(IDbContextFactory<DumcsiDbContext> dbContextFactory, IHubContext<ChatHub> chatHubContext, IPermissionService permissionService) 
    : BaseApiController(dbContextFactory)
{
    [HttpPut("{emoji}")]
    public async Task<IActionResult> AddReaction(long channelId, long messageId, string emoji, CancellationToken cancellationToken)
    {
        var (isMember, hasPermission) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.AddReactions);

        if (!isMember) 
        {
            return StatusCode(403, ApiResponse.Fail("REACTION_ACCESS_DENIED", "You are not a member of this server."));
        }
        if (!hasPermission) 
        {
            return StatusCode(403, ApiResponse.Fail("REACTION_FORBIDDEN_ADD", "You do not have permission to add reactions in this channel."));
        }

        var emojiId = WebUtility.UrlDecode(emoji);
        
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);

        if (message == null || user == null)
        {
            return NotFound(ApiResponse.Fail("REACTION_PREREQUISITES_NOT_FOUND", "The message or user could not be found."));
        }

        var reaction = new Reaction
        {
            MessageId = messageId,
            UserId = CurrentUserId,
            EmojiId = emojiId,
            Message = message,
            User = user
        };

        dbContext.Reactions.Add(reaction);
    
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) 
        { 
            // The reaction already exists, which is not an error in this context.
            // The user's intent was to have the reaction present, and it is.
        }
        
        var payload = new 
        {
            ChannelId = channelId,
            MessageId = messageId,
            EmojiId = emojiId,
            UserId = CurrentUserId 
        };
        
        await chatHubContext.Clients.Group(channelId.ToString()).SendAsync("ReactionAdded", payload, cancellationToken);
    
        return OkResponse("Reaction added.");
    }

    [HttpDelete("{emoji}")]
    public async Task<IActionResult> RemoveReaction(long channelId, long messageId, string emoji, CancellationToken cancellationToken)
    {
        var (isMember, _) = await permissionService.CheckPermissionsForChannelAsync(CurrentUserId, channelId, Permission.None);
        if (!isMember)
        {
            return StatusCode(403, ApiResponse.Fail("REACTION_ACCESS_DENIED", "You are not a member of this server."));
        }

        var emojiId = WebUtility.UrlDecode(emoji);
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var reaction = await dbContext.Reactions
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == CurrentUserId && r.EmojiId == emojiId, cancellationToken);
            
        if (reaction != null)
        {
            dbContext.Reactions.Remove(reaction);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        // If reaction is null, it means the user already removed it or never added it.
        // This is not an error condition, so we proceed silently.
        
        var payload = new 
        {
            ChannelId = channelId,
            MessageId = messageId,
            EmojiId = emojiId,
            UserId = CurrentUserId
        };
        
        await chatHubContext.Clients.Group(channelId.ToString()).SendAsync("ReactionRemoved", payload, cancellationToken);
        
        return OkResponse("Reaction removed.");
    }
}