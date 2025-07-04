using System.Net;
using System.Security.Claims;
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
public class ReactionController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    private async Task<(bool IsMember, bool HasPermission)> CheckPermissionsForChannel(long channelId, Permission requiredPermission)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return (false, false);
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var member = await dbContext.ServerMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Server.Channels.Any(c => c.Id == channelId))
            .Include(m => m.Roles)
            .FirstOrDefaultAsync();

        if (member == null)
        {
            return (false, false);
        }

        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

        if (permissions.HasFlag(Permission.Administrator))
        {
            return (true, true);
        }

        return (true, permissions.HasFlag(requiredPermission));
    }

    [HttpPut("{emoji}")]
    public async Task<IActionResult> AddReaction(long channelId, long messageId, string emoji, CancellationToken cancellationToken)
    {
        var emojiId = WebUtility.UrlDecode(emoji);

        var (isMember, hasPermission) = await CheckPermissionsForChannel(channelId, Permission.AddReactions);

        if (!isMember) return Forbid("You are not a member of this server.");
        if (!hasPermission) return Forbid("You do not have permission to add reactions.");
    
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var message = await dbContext.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.ChannelId == channelId, cancellationToken);
        var user = await dbContext.Users.FindAsync([userId], cancellationToken);

        if (message == null || user == null)
        {
            return NotFound("Message or user not found.");
        }

        var reaction = new Reaction
        {
            MessageId = messageId,
            UserId = userId,
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
            // A reakció már létezik, nem csinálunk semmit.
        }
    
        return NoContent();
    }

    [HttpDelete("{emoji}")]
    public async Task<IActionResult> RemoveReaction(long channelId, long messageId, string emoji, CancellationToken cancellationToken)
    {
        var emojiId = WebUtility.UrlDecode(emoji);
        
        // A saját reakció eltávolításához elég, ha a felhasználó tag.
        var (isMember, _) = await CheckPermissionsForChannel(channelId, Permission.None);
        if (!isMember)
        {
            return Forbid("You are not a member of this server.");
        }

        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        // Megkeressük a pontos reakciót, amit a jelenlegi felhasználó adott.
        var reaction = await dbContext.Reactions
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.EmojiId == emojiId, cancellationToken);
            
        if (reaction != null)
        {
            dbContext.Reactions.Remove(reaction);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        
        // Akkor is sikeres a kérés, ha a reakció már nem létezett.
        return NoContent();
    }
}