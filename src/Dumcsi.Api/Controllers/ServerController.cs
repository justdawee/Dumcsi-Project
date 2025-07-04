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
        if (userIdClaim == null || !long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return Unauthorized();

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

        // 1. Alapértelmezett "@everyone" szerepkör létrehozása
        var everyoneRole = new Role
        {
            Name = "@everyone",
            Server = server,
            Permissions = Permission.ViewChannels | Permission.ReadMessageHistory | Permission.SendMessages | Permission.AddReactions | Permission.Connect | Permission.Speak,
            Position = 0,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant()
        };
        
        // 2. "Admin" szerepkör létrehozása a tulajdonosnak
        var adminRole = new Role
        {
            Name = "Admin",
            Server = server,
            Permissions = Permission.Administrator, // Adminisztrátor minden jogot megkap
            Position = 1,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        // 3. Szerver tagság létrehozása a tulajdonosnak
        var serverMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = DateTimeOffset.UtcNow.ToInstant()
        };
        
        // Admin és @everyone szerepkörök hozzárendelése a tulajdonoshoz
        serverMember.Roles.Add(everyoneRole);
        serverMember.Roles.Add(adminRole);

        // Alapértelmezett "general" csatorna
        var defaultChannel = new Channel
        {
            Name = "general",
            Server = server,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant(),
            UpdatedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        dbContext.Servers.Add(server);
        dbContext.Roles.AddRange(everyoneRole, adminRole);
        dbContext.ServerMembers.Add(serverMember);
        dbContext.Channels.Add(defaultChannel);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { ServerId = server.Id, Message = "Server created successfully" });
    }

    [HttpGet("{id}")] // GET /api/server/{id}
    public async Task<IActionResult> GetServerById(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers
            .AsNoTracking()
            .Include(s => s.Owner)
            .Include(s => s.Channels.OrderBy(c => c.Position))
            // A jelenlegi felhasználó tagságát és szerepköreit is betöltjük
            .Include(s => s.Members.Where(m => m.UserId == userId))
                .ThenInclude(m => m.Roles)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (server == null) return NotFound("Server not found");

        var currentUserMembership = server.Members.FirstOrDefault();
        if (currentUserMembership == null) return Forbid("You are not a member of this server");

        // Jogosultságok összesítése: a felhasználó összes szerepkörének jogosultságát "össze-vagyoljuk"
        var currentUserPermissions = currentUserMembership.Roles
            .Aggregate(Permission.None, (current, role) => current | role.Permissions);

        var memberCount = await dbContext.ServerMembers.CountAsync(sm => sm.ServerId == id, cancellationToken);

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
            CurrentUserPermissions = currentUserPermissions, // Itt már az összesített jogosultságokat adjuk vissza
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
    
        if (!isMember) return Forbid("You are not a member of this server");
    
        var members = await dbContext.ServerMembers
            .AsNoTracking()
            .Where(sm => sm.ServerId == id)
            .Include(sm => sm.User)
            .Include(sm => sm.Roles) // Betöltjük a tagok szerepköreit
            .OrderBy(m => m.JoinedAt)
            .Select(sm => new ServerDtos.ServerMemberDto
            {
                UserId = sm.UserId,
                Username = sm.User.Username,
                ProfilePictureUrl = sm.User.ProfilePictureUrl,
                JoinedAt = sm.JoinedAt,
                // A szerepköröket átalakítjuk RoleDto-vá
                Roles = sm.Roles.Select(r => new ServerDtos.RoleDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    Color = r.Color,
                    Position = r.Position,
                    Permissions = r.Permissions
                }).OrderByDescending(r => r.Position).ToList() // Legmagasabb szerepkör elöl
            })
            .ToListAsync(cancellationToken);
    
        return Ok(members);
    }
    
    [HttpPost("{id}/invite")] // POST /api/server/{id}/invite
    public async Task<IActionResult> InviteToServer(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        // Jogosultság ellenőrzése: Csak az hozhat létre meghívót, akinek van 'CreateInvite' joga.
        var hasPermission = await HasPermissionAsync(dbContext, userId, id, Permission.CreateInvite, cancellationToken);
        if (!hasPermission)
        {
            return Forbid("You don't have permission to create invites.");
        }

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFound("Server not found.");
        }

        // Ha még nincs meghívó kód, generálunk egyet.
        // Megjegyzés: Egy fejlettebb rendszerben ez egy külön 'Invite' entitás lenne lejárattal, max használattal stb.
        if (string.IsNullOrEmpty(server.InviteCode))
        {
            server.InviteCode = Guid.NewGuid().ToString("N")[..8]; // Generál egy 8 karakteres kódot
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { InviteCode = server.InviteCode });
    }
    
    [HttpPost("join")] // POST /api/server/join
    public async Task<IActionResult> JoinServerByCode([FromBody] ServerDtos.JoinServerRequestDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers
            .FirstOrDefaultAsync(s => s.InviteCode == request.InviteCode, cancellationToken);

        if (server == null)
        {
            return NotFound("Invalid invite code.");
        }

        var isAlreadyMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == server.Id && sm.UserId == userId, cancellationToken);

        if (isAlreadyMember)
        {
            return BadRequest("You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return Unauthorized();

        // Keressük meg a szerverhez tartozó "@everyone" szerepkört.
        var everyoneRole = await dbContext.Roles
            .FirstOrDefaultAsync(r => r.ServerId == server.Id && r.Name == "@everyone", cancellationToken);

        if (everyoneRole == null)
        {
            // Ez egy belső hiba, minden szervernek lennie kellene ilyen szerepkörnek.
            return StatusCode(500, "Server configuration error: default role not found.");
        }

        var newMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = DateTimeOffset.UtcNow.ToInstant()
        };
    
        // Hozzárendeljük az új taghoz az "@everyone" szerepkört.
        newMember.Roles.Add(everyoneRole);

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { ServerId = server.Id, Message = "Successfully joined server." });
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
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // A jogosultság ellenőrző logikát egy külön helper metódusba szervezzük
        var hasPermission = await HasPermissionAsync(dbContext, userId, id, Permission.ManageChannels, cancellationToken);
        if (!hasPermission)
        {
            return Forbid("You don't have permission to create channels.");
        }

        var server = await dbContext.Servers.FindAsync(new object[] { id }, cancellationToken);
        if (server == null) return NotFound("Server not found");

        var channel = new Channel
        {
            Server = server,
            Name = request.Name,
            Description = request.Description,
            Type = request.Type,
            CreatedAt = DateTimeOffset.UtcNow.ToInstant(),
            UpdatedAt = DateTimeOffset.UtcNow.ToInstant()
        };

        dbContext.Channels.Add(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        var channelDto = new ChannelDtos.ChannelListItemDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            Position = channel.Position,
            CreatedAt = channel.CreatedAt
        };
        
        return CreatedAtAction(nameof(GetChannels), new { id = server.Id }, channelDto);
    }
    
    [HttpPut("{id}")] // PUT /api/server/{id}
    public async Task<IActionResult> UpdateServer(long id, [FromBody] ServerDtos.UpdateServerRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

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
            return Forbid("Only the server owner can update the server");
        }

        server.Name = request.Name;
        server.Description = request.Description;
        server.IconUrl = request.IconUrl;
        server.IsPublic = request.IsPublic;
        server.UpdatedAt = DateTimeOffset.UtcNow.ToInstant();

        dbContext.Servers.Update(server);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { Message = "Server updated successfully" });
    }
    
    [HttpGet("public")] // GET /api/server/public
    public async Task<IActionResult> GetPublicServers(CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var servers = await dbContext.Servers
            .Where(s => s.IsPublic)
            .Select(s => new ServerDtos.ServerListItemDto
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description ?? string.Empty,
                IconUrl = s.IconUrl,
                MemberCount = s.Members.Count,
                OwnerId = s.OwnerId,
                IsPublic = s.IsPublic,
                CreatedAt = s.CreatedAt
            })
            .OrderByDescending(s => s.MemberCount) // Legnépszerűbbek elöl
            .ToListAsync(cancellationToken);

        return Ok(servers);
    }
    
    [HttpPost("{id}/join")] // POST /api/server/{id}/join
    public async Task<IActionResult> JoinPublicServer(long id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !long.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync(new object[] { id }, cancellationToken);

        if (server == null)
        {
            return NotFound("Server not found.");
        }

        if (!server.IsPublic)
        {
            return Forbid("This server is not public. You need an invite to join.");
        }

        var isAlreadyMember = await dbContext.ServerMembers
            .AnyAsync(sm => sm.ServerId == server.Id && sm.UserId == userId, cancellationToken);

        if (isAlreadyMember)
        {
            return BadRequest("You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return Unauthorized();

        // Itt is megkeressük és hozzárendeljük az "@everyone" szerepkört.
        var everyoneRole = await dbContext.Roles
            .FirstOrDefaultAsync(r => r.ServerId == server.Id && r.Name == "@everyone", cancellationToken);

        if (everyoneRole == null)
        {
            return StatusCode(500, "Server configuration error: default role not found.");
        }

        var newMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = DateTimeOffset.UtcNow.ToInstant()
        };
    
        newMember.Roles.Add(everyoneRole);

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { ServerId = server.Id, Message = "Successfully joined server." });
    }
    
    // Helpers:
    private async Task<bool> HasPermissionAsync(DumcsiDbContext dbContext, long userId, long serverId, Permission requiredPermission, CancellationToken cancellationToken)
    {
        var member = await dbContext.ServerMembers
            .AsNoTracking()
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(m => m.UserId == userId && m.ServerId == serverId, cancellationToken);

        if (member == null) return false;

        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

        // Az adminisztrátor mindent felülbírál
        if (permissions.HasFlag(Permission.Administrator))
        {
            return true;
        }

        return permissions.HasFlag(requiredPermission);
    }
}