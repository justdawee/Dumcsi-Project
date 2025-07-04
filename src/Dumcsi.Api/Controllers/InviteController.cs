using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Api.Controllers;

[ApiController]
[Route("api/invites")]
public class InviteController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    // GET /{inviteCode}: Információk lekérése egy meghívóról
    [HttpGet("{inviteCode}")]
    public async Task<IActionResult> GetInviteInfo(string inviteCode, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var invite = await dbContext.Invites
            .AsNoTracking()
            .Include(i => i.Server)
            .ThenInclude(s => s.Members)
            .FirstOrDefaultAsync(i => i.Code == inviteCode, cancellationToken);

        if (invite == null || (invite.ExpiresAt.HasValue && invite.ExpiresAt < SystemClock.Instance.GetCurrentInstant()))
        {
            return NotFound("This invite is invalid or has expired.");
        }

        var response = new InviteDtos.InviteInfoDto
        {
            Code = invite.Code,
            Server = new InviteDtos.InviteInfoDto.ServerInfo
            {
                Id = invite.Server.Id,
                Name = invite.Server.Name,
                IconUrl = invite.Server.IconUrl,
                MemberCount = invite.Server.Members.Count
            }
        };

        return Ok(response);
    }

    // POST /{inviteCode}: Csatlakozás a szerverhez a meghívóval
    [Authorize]
    [HttpPost("{inviteCode}")]
    public async Task<IActionResult> JoinServerByInvite(string inviteCode, CancellationToken cancellationToken)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var invite = await dbContext.Invites.FirstOrDefaultAsync(i => i.Code == inviteCode, cancellationToken);

        if (invite == null || (invite.ExpiresAt.HasValue && invite.ExpiresAt < SystemClock.Instance.GetCurrentInstant()))
        {
            return NotFound("This invite is invalid or has expired.");
        }
        if (invite.MaxUses > 0 && invite.CurrentUses >= invite.MaxUses)
        {
            return BadRequest("This invite has reached its maximum number of uses.");
        }

        var serverId = invite.ServerId;
        var isAlreadyMember = await dbContext.ServerMembers.AnyAsync(sm => sm.ServerId == serverId && sm.UserId == userId, cancellationToken);
        if (isAlreadyMember)
        {
            return BadRequest("You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync([userId], cancellationToken);
        var server = await dbContext.Servers.FindAsync([serverId], cancellationToken);
        var everyoneRole = await dbContext.Roles.FirstAsync(r => r.ServerId == serverId && r.Name == "@everyone", cancellationToken);

        if (user == null || server == null) return NotFound();

        var newMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = SystemClock.Instance.GetCurrentInstant()
        };
        newMember.Roles.Add(everyoneRole);

        invite.CurrentUses++;

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { ServerId = server.Id, Message = "Successfully joined server." });
    }
}