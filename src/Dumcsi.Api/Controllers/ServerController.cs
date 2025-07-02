using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime.Extensions;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server")]
public class ServerController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    [HttpGet] // GET /api/server
    public async Task<IActionResult> GetServers(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var servers = await dbContext.ServerMembers
            .Where(sm => sm.UserId == userId) // Azok a membership-ek, ahol ez a user
            .Select(sm => new ServerDtos.ServerListItemDto
            {
                Id = sm.Server.Id,
                Name = sm.Server.Name,
                Description = sm.Server.Description ?? string.Empty,
                IconUrl = sm.Server.IconUrl,
                MemberCount = sm.Server.Members.Count,
                OwnerId = sm.Server.OwnerId,
                IsOwner = sm.Server.OwnerId == userId, // Saját szerver-e?
                MemberLimit = sm.Server.MemberLimit ?? 0,
                IsPublic = sm.Server.IsPublic,
                CreatedAt = sm.Server.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(servers);
    }

    [HttpPost] // POST /api/server
    public async Task<IActionResult> PostServer([FromBody] ServerDtos.CreateServerRequestDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync(userId, cancellationToken);
        if (user == null)
        {
            return Unauthorized();
        }

        var server = new Server
        {
            Name = request.Name,
            Description = request.Description,
            IsPublic = request.IsPublic,
            OwnerId = userId,
            Owner = user,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant(),
            UpdatedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        dbContext.Servers.Add(server);
        await dbContext.SaveChangesAsync(cancellationToken); // ← Fontos: Save-elni kell, hogy legyen server.Id

        var serverMember = new ServerMember
        {
            UserId = userId,
            ServerId = server.Id,
            User = user,
            Server = server,
            Role = Role.Admin,
            JoinedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        var defaultChannel = new Channel
        {
            Name = "general",
            Description = "Default channel",
            Type = ChannelType.Text,
            Position = 0,
            ServerId = server.Id,
            Server = server,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant(),
            UpdatedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        dbContext.ServerMembers.Add(serverMember);
        dbContext.Channels.Add(defaultChannel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { ServerId = server.Id, Message = "Server created successfully with default channel" });
    }

    [HttpGet("{id}")] // GET /api/server/{id}
    public async Task<IActionResult> GetServerById(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers
            .Include(s => s.Owner)
            .Include(s => s.Members.Where(m => m.UserId == userId)) // Csak a current user membership
            .Include(s => s.Channels.OrderBy(c => c.Position))
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (server == null)
        {
            return NotFound("Server not found");
        }

        var currentUserMembership = server.Members.FirstOrDefault();
        if (currentUserMembership == null)
        {
            return Forbid("You are not a member of this server");
        }

        var memberCount = await dbContext.ServerMembers
            .CountAsync(sm => sm.ServerId == id, cancellationToken);

        var response = new ServerDtos.ServerDetailDto
        {
            Id = server.Id,
            Name = server.Name,
            Description = server.Description ?? string.Empty,
            IconUrl = server.IconUrl,
            OwnerId = server.OwnerId,
            OwnerUsername = server.Owner.Username,
            MemberCount = memberCount,
            IsOwner = server.OwnerId == userId,
            IsPublic = server.IsPublic,
            CurrentUserRole = currentUserMembership.Role,
            CreatedAt = server.CreatedAt,
            Channels = server.Channels.Select(c => new ServerDtos.ChannelDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Type = c.Type,
                Position = c.Position
            }).ToList()
        };

        return Ok(response);
    }

    [HttpGet("{id}/members")] // GET /api/server/{id}/members
    public async Task<IActionResult> GetServerMembers(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == id && sm.UserId == userId, cancellationToken);

        if (!isMember)
        {
            return Forbid("You are not a member of this server");
        }

        var members = await dbContext.ServerMembers
            .Where(sm => sm.ServerId == id)
            .Select(sm => new ServerDtos.ServerMemberDto
            {
                UserId = sm.UserId,
                Username = sm.User.Username,
                ProfilePictureUrl = sm.User.ProfilePictureUrl,
                Role = sm.Role,
                JoinedAt = sm.JoinedAt
            })
            .OrderBy(m => m.JoinedAt)
            .ToListAsync(cancellationToken);

        return Ok(members);
    }
    
    [HttpPost("{id}/invite")] // POST /api/server/{id}/invite
    public async Task<IActionResult> InviteToServer(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var membership = await dbContext.ServerMembers
            .Include(sm => sm.Server)
            .FirstOrDefaultAsync(sm => sm.ServerId == id && sm.UserId == userId, cancellationToken);

        if (membership == null)
        {
            return Forbid("You are not a member of this server");
        }

        if (membership.Role == Role.Member)
        {
            return Forbid("Only moderators and admins can create invites");
        }

        var inviteCode = Guid.NewGuid().ToString("N")[..8].ToUpper(); // 8 karakter

        membership.Server.InviteCode = inviteCode;
        membership.Server.UpdatedAt = DateTimeOffset.UtcNow.ToInstant();

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { InviteCode = inviteCode, Message = "Invite code generated successfully" });
    }
    
    [HttpPost("join")] 
    public async Task<IActionResult> JoinServerByCode([FromBody] ServerDtos.JoinServerByCodeRequestDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var server = await dbContext.Servers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.InviteCode == request.InviteCode, cancellationToken);

        if (server == null)
        {
            return BadRequest("Invalid invite code.");
        }
    
        // A logika többi része változatlan és helyes.
        var existingMembership = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == server.Id && sm.UserId == userId, cancellationToken);

        if (existingMembership)
        {
            return BadRequest("You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
        {
            return Unauthorized();
        }

        var serverMember = new ServerMember
        {
            UserId = userId,
            ServerId = server.Id,
            User = user,
            Server = (await dbContext.Servers.FindAsync([server.Id], cancellationToken))!,
            Role = Role.Member,
            JoinedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        dbContext.ServerMembers.Add(serverMember);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        return Ok(new { Message = "Successfully joined the server.", ServerName = server.Name, ServerId = server.Id });
    }
    
    [HttpPost("{id}/leave")] // POST /api/server/{id}/leave
    public async Task<IActionResult> LeaveServer(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync(id, cancellationToken);
        if (server == null)
        {
            return NotFound("Server not found");
        }

        if (server.OwnerId == userId)
        {
            return BadRequest("Server owner cannot leave. Delete the server instead.");
        }

        var membership = await dbContext.ServerMembers
            .FirstOrDefaultAsync(sm => sm.ServerId == id && sm.UserId == userId, cancellationToken);

        if (membership == null)
        {
            return BadRequest("You are not a member of this server");
        }

        dbContext.ServerMembers.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { Message = "Successfully left the server" });
    }

    [HttpDelete("{id}")] // DELETE /api/server/{id}
    public async Task<IActionResult> DeleteServer(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync(id, cancellationToken);
        if (server == null)
        {
            return NotFound("Server not found");
        }

        if (server.OwnerId != userId)
        {
            return Forbid("Only the server owner can delete the server");
        }

        dbContext.Servers.Remove(server);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { Message = "Server deleted successfully" });
    }

    [HttpGet("{id}/channels")] // GET /api/server/{id}/channels
    public async Task<IActionResult> GetChannels(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var serverExists = await dbContext.Servers.AnyAsync(s => s.Id == id, cancellationToken);
        if (!serverExists)
            return NotFound("Server not found");

        var channels = await dbContext.Channels
            .Where(c => c.ServerId == id)
            .Select(c => new ChannelDtos.ChannelListItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Type = c.Type,
                Position = c.Position,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(channels);
    }

    [HttpPost("{id}/channels")] // POST /api/server/{id}/channels
    public async Task<IActionResult> CreateChannel(long id, [FromBody] ChannelDtos.CreateChannelRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var serverExists = await dbContext.Servers.AnyAsync(s => s.Id == id, cancellationToken);
        if (!serverExists)
            return NotFound("Server not found");

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out long userId))
            return Unauthorized();

        var isMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == id && sm.UserId == userId, cancellationToken);

        if (!isMember)
            return Forbid("You are not a member of this server");

        var memberRole = await dbContext.ServerMembers
            .Where(sm => sm.ServerId == id && sm.UserId == userId)
            .Select(sm => sm.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (memberRole == Role.Member)
            return Forbid("Only moderators and admins can create channels");

        var channel = new Channel
        {
            ServerId = id,
            Name = request.Name,
            Description = request.Description,
            Type = request.Type,
            Position = 0,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant(),
            Server = await dbContext.Servers
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken)
        };

        dbContext.Channels.Add(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetChannels), new { id }, new ChannelDtos.ChannelListItemDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            Position = channel.Position,
            CreatedAt = channel.CreatedAt
        });
    }
}