using Dumcsi.Api.Common;
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
            return NotFoundResponse("This invite is invalid or has expired.");
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
            .Include(i => i.Server) // <-- Töltsük be a szervert is a naplózáshoz
            .FirstOrDefaultAsync(i => i.Code == inviteCode, cancellationToken);

        if (invite == null || (invite.ExpiresAt.HasValue && invite.ExpiresAt < SystemClock.Instance.GetCurrentInstant()))
        {
            return NotFoundResponse("This invite is invalid or has expired.");
        }
        if (invite.MaxUses > 0 && invite.CurrentUses >= invite.MaxUses)
        {
            return BadRequestResponse("This invite has reached its maximum number of uses.");
        }

        var serverId = invite.ServerId;
        if (await dbContext.ServerMembers.AnyAsync(sm => sm.ServerId == serverId && sm.UserId == CurrentUserId, cancellationToken))
        {
            return BadRequestResponse("You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        var everyoneRole = await dbContext.Roles.FirstAsync(r => r.ServerId == serverId && r.Name == "@everyone", cancellationToken);

        if (user == null) return NotFoundResponse("Critical error: User or Server not found.");

        var newMember = new ServerMember
        {
            User = user,
            Server = invite.Server,
            JoinedAt = SystemClock.Instance.GetCurrentInstant()
        };
        newMember.Roles.Add(everyoneRole);

        invite.CurrentUses++;

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit log bejegyzés a csatlakozásról
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
        // Értesítjük a szerver többi tagját, hogy új felhasználó érkezett.
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("UserJoinedServer", new { User = userDto, ServerId = serverId }, cancellationToken);

        return OkResponse(new { ServerId = serverId }, "Successfully joined server.");
    }
    
}