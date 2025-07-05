using System.Net;
using Dumcsi.Api.Common;
using Dumcsi.Api.Helpers;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/channels/{channelId}/messages/{messageId}/reactions")]
public class ReactionController(IDbContextFactory<DumcsiDbContext> dbContextFactory) 
    : BaseApiController(dbContextFactory)
{
    [HttpPut("{emoji}")]
    public async Task<IActionResult> AddReaction(long channelId, long messageId, string emoji, CancellationToken cancellationToken)
    {
        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, channelId, Permission.AddReactions);

        if (!isMember) 
        {
            return ForbidResponse("You are not a member of this server.");
        }
        if (!hasPermission) 
        {
            return ForbidResponse("You do not have permission to add reactions in this channel.");
        }

        var emojiId = WebUtility.UrlDecode(emoji);
        
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);

        if (message == null || user == null)
        {
            return NotFoundResponse("Message or user not found.");
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
            // A reakció már létezik, ami nem hiba.
        }
    
        return OkResponse("Reaction added.");
    }

    [HttpDelete("{emoji}")]
    public async Task<IActionResult> RemoveReaction(long channelId, long messageId, string emoji, CancellationToken cancellationToken)
    {
        var (isMember, _) = await this.CheckPermissionsForChannelAsync(DbContextFactory, channelId, Permission.None);
        if (!isMember)
        {
            return ForbidResponse("You are not a member of this server.");
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
        
        return OkResponse("Reaction removed.");
    }
}