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

[ApiController]
[Route("api/invites")]
public class InviteController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IHubContext<ChatHub> chatHubContext)
    : BaseApiController(dbContextFactory)
{
    [HttpGet("{inviteCode}")]
    public async Task<IActionResult> GetInviteInfo(string inviteCode, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var invite = await dbContext.Invites
            .AsNoTracking()
            .Include(i => i.Server)
            .ThenInclude(s => s.Members)
            .FirstOrDefaultAsync(i => i.Code == inviteCode, cancellationToken);

        if (invite == null || (invite.ExpiresAt.HasValue && invite.ExpiresAt < SystemClock.Instance.GetCurrentInstant()))
        {
            return NotFound(ApiResponse.Fail("INVITE_NOT_FOUND_OR_EXPIRED", "This invite is invalid or has expired."));
        }

        var response = new InviteDtos.InviteInfoDto
        {
            Code = invite.Code,
            Server = new InviteDtos.InviteInfoDto.ServerInfo
            {
                Id = invite.Server.Id,
                Name = invite.Server.Name,
                Icon = invite.Server.Icon,
                Description = invite.Server.Description,
                MemberCount = invite.Server.Members.Count
            }
        };

        return OkResponse(response);
    }

    [Authorize]
    [HttpPost("{inviteCode}")]
    public async Task<IActionResult> JoinServerByInvite(string inviteCode, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var invite = await dbContext.Invites
            .Include(i => i.Server)
            .FirstOrDefaultAsync(i => i.Code == inviteCode, cancellationToken);

        if (invite == null || (invite.ExpiresAt.HasValue && invite.ExpiresAt < SystemClock.Instance.GetCurrentInstant()))
        {
            return NotFound(ApiResponse.Fail("INVITE_NOT_FOUND_OR_EXPIRED", "This invite is invalid or has expired."));
        }
        
        if (invite.MaxUses > 0 && invite.CurrentUses >= invite.MaxUses)
        {
            return BadRequest(ApiResponse.Fail("INVITE_MAX_USES_REACHED", "This invite has reached its maximum number of uses."));
        }

        var serverId = invite.ServerId;
        if (await dbContext.ServerMembers.AnyAsync(sm => sm.ServerId == serverId && sm.UserId == CurrentUserId, cancellationToken))
        {
            return ConflictResponse("INVITE_ALREADY_MEMBER", "You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null)
        {
            // This should not happen for an authorized user, but it's a good safeguard.
            return Unauthorized(ApiResponse.Fail("AUTH_USER_NOT_FOUND", "Authenticated user could not be found."));
        }
        
        var everyoneRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.ServerId == serverId && r.Name == "@everyone", cancellationToken);
        if (everyoneRole == null)
        {
            // This indicates a server setup issue.
            return StatusCode(500, ApiResponse.Fail("SERVER_SETUP_ERROR", "The default '@everyone' role is missing on the server."));
        }

        var newMember = new ServerMember
        {
            User = user,
            Server = invite.Server,
            JoinedAt = SystemClock.Instance.GetCurrentInstant(),
            IsTemporary = invite.IsTemporary
        };
        newMember.Roles.Add(everyoneRole);

        invite.CurrentUses++;

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(
            serverId,
            CurrentUserId,
            AuditLogActionType.ServerMemberJoined,
            CurrentUserId,
            AuditLogTargetType.User,
            reason: $"User joined via invite code: {invite.Code}"
        );
        
        var userDto = new UserDtos.UserProfileDto 
        {
            Id = user.Id,
            Username = user.Username,
            GlobalNickname = user.GlobalNickname,
            Avatar = user.Avatar
        };
        
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("UserJoinedServer", new { User = userDto, ServerId = serverId }, cancellationToken);

        var serverName = invite.Server.Name;
        return OkResponse(new { ServerId = serverId, ServerName = serverName }, "Successfully joined server.");
    }
}
