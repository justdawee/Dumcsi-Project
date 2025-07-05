using System.Security.Claims;
using Dumcsi.Api.Common;
using Dumcsi.Api.Helpers;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server")]
public class ServerController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory, 
    IAuditLogService auditLogService) 
    : BaseApiController(dbContextFactory)
{
    [HttpGet]
    public async Task<IActionResult> GetServers(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var servers = await dbContext.ServerMembers
            .Where(sm => sm.UserId == CurrentUserId)
            .Select(sm => new ServerDtos.ServerListItemDto
            {
                Id = sm.Server.Id,
                Name = sm.Server.Name,
                Description = sm.Server.Description ?? string.Empty,
                Icon = sm.Server.Icon,
                MemberCount = sm.Server.Members.Count,
                OwnerId = sm.Server.OwnerId,
                IsOwner = sm.Server.OwnerId == CurrentUserId,
                Public = sm.Server.Public,
                CreatedAt = sm.Server.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return OkResponse(servers);
    }

    [HttpPost]
    public async Task<IActionResult> CreateServer([FromBody] ServerDtos.CreateServerRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync(new object[] { CurrentUserId }, cancellationToken);
        if (user == null) return Unauthorized();

        var server = new Server
        {
            Name = request.Name,
            Description = request.Description,
            Public = request.Public,
            OwnerId = CurrentUserId,
            Owner = user,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            UpdatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        var everyoneRole = new Role
        {
            Name = "@everyone",
            Server = server,
            Permissions = Permission.ViewChannels | Permission.ReadMessageHistory | Permission.SendMessages | Permission.AddReactions | Permission.Connect | Permission.Speak,
            Position = 0,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };
        
        var adminRole = new Role
        {
            Name = "Admin",
            Server = server,
            Permissions = Permission.Administrator,
            Position = 1,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        var serverMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = SystemClock.Instance.GetCurrentInstant()
        };
        
        serverMember.Roles.Add(everyoneRole);
        serverMember.Roles.Add(adminRole);

        var defaultChannel = new Channel
        {
            Name = "general",
            Server = server,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            UpdatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.Servers.Add(server);
        dbContext.Roles.AddRange(everyoneRole, adminRole);
        dbContext.ServerMembers.Add(serverMember);
        dbContext.Channels.Add(defaultChannel);

        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(server.Id, CurrentUserId, AuditLogActionType.ServerCreated, server.Id, AuditLogTargetType.Server, new { server.Name });

        return OkResponse(new { ServerId = server.Id }, "Server created successfully.");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServerById(long id, CancellationToken cancellationToken)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.ViewChannels))
        {
            return ForbidResponse();
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers
            .AsNoTracking()
            .Include(s => s.Owner)
            .Include(s => s.Channels.OrderBy(c => c.Position))
            .Include(s => s.Members.Where(m => m.UserId == CurrentUserId))
            .ThenInclude(m => m.Roles)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (server == null) return NotFoundResponse("Server not found.");

        var currentUserMembership = server.Members.First();
        var currentUserPermissions = currentUserMembership.Roles
            .Aggregate(Permission.None, (current, role) => current | role.Permissions);

        var memberCount = await dbContext.ServerMembers.CountAsync(sm => sm.ServerId == id, cancellationToken);

        var response = new ServerDtos.ServerDetailDto
        {
            Id = server.Id,
            Name = server.Name,
            Description = server.Description ?? string.Empty,
            Icon = server.Icon,
            OwnerId = server.OwnerId,
            OwnerUsername = server.Owner.Username,
            MemberCount = memberCount,
            IsOwner = server.OwnerId == CurrentUserId,
            Public = server.Public,
            CurrentUserPermissions = currentUserPermissions,
            CreatedAt = server.CreatedAt,
            Channels = server.Channels.Select(c => new ChannelDtos.ChannelListItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Type = c.Type,
                Position = c.Position
            }).ToList()
        };

        return OkResponse(response);
    }
    
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateServer(long id, [FromBody] ServerDtos.UpdateServerRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequestResponse("Invalid request data.");

        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.ManageServer))
        {
            return ForbidResponse();
        }
        
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null) return NotFoundResponse("Server not found.");

        if (server.OwnerId != CurrentUserId) return ForbidResponse("Only the server owner can update the server.");

        var oldValues = new { server.Name, server.Description, server.Icon, server.Public };

        server.Name = request.Name;
        server.Description = request.Description;
        server.Icon = request.Icon;
        server.Public = request.Public;
        server.UpdatedAt = SystemClock.Instance.GetCurrentInstant();
        
        await dbContext.SaveChangesAsync(cancellationToken);

        var changes = new
        {
            Name = new { Old = oldValues.Name, New = server.Name },
            Description = new { Old = oldValues.Description, New = server.Description },
            Icon = new { Old = oldValues.Icon, New = server.Icon },
            Public = new { Old = oldValues.Public, New = server.Public }
        };

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerUpdated, id, AuditLogTargetType.Server, changes);

        return OkResponse("Server updated successfully.");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteServer(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFoundResponse("Server not found.");
        }
        
        if (server.OwnerId != CurrentUserId)
        {
            return ForbidResponse("Only the server owner can delete the server.");
        }

        dbContext.Servers.Remove(server);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit log bejegyzés a szerver törléséről
        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerDeleted, id, AuditLogTargetType.Server);

        return OkResponse("Server deleted successfully."); // <-- Szabványos válasz
    }
    
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetServerMembers(long id, CancellationToken cancellationToken)
    {
        // A tagok listázásához elég, ha a felhasználó látja a csatornákat.
        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.ViewChannels))
        {
            return ForbidResponse();
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var members = await dbContext.ServerMembers
            .AsNoTracking()
            .Where(sm => sm.ServerId == id)
            .Include(sm => sm.User)
            .Include(sm => sm.Roles)
            .OrderBy(m => m.User.Username)
            .Select(sm => new ServerDtos.ServerMemberDto
            {
                UserId = sm.UserId,
                Username = sm.User.Username,
                Avatar = sm.User.Avatar,
                JoinedAt = sm.JoinedAt,
                Deafened = sm.Deafened,
                Muted = sm.Muted,
                Roles = sm.Roles.Select(r => new ServerDtos.RoleDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    Color = r.Color,
                    Position = r.Position,
                    Permissions = r.Permissions,
                    IsHoisted = r.IsHoisted,
                    IsMentionable = r.IsMentionable
                }).OrderByDescending(r => r.Position).ToList()
            })
            .ToListAsync(cancellationToken);

        return OkResponse(members);
    }
    
    [HttpPost("{id}/invite")]
    public async Task<IActionResult> CreateInvite(long id, [FromBody] InviteDtos.CreateInviteRequestDto request, CancellationToken cancellationToken)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.CreateInvite))
        {
            return ForbidResponse("You don't have permission to create invites.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        var creator = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);

        if (server == null || creator == null) return NotFoundResponse("Server or creator not found.");

        var expiresAt = request.ExpiresInHours.HasValue
            ? SystemClock.Instance.GetCurrentInstant().Plus(Duration.FromHours(request.ExpiresInHours.Value))
            : (Instant?)null;

        var invite = new Invite
        {
            Code = Guid.NewGuid().ToString("N")[..8].ToUpper(),
            Server = server,
            Creator = creator,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            MaxUses = request.MaxUses,
            ExpiresAt = expiresAt,
            IsTemporary = request.IsTemporary
        };

        dbContext.Invites.Add(invite);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit log bejegyzés a meghívó létrehozásáról
        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.InviteCreated, null, AuditLogTargetType.Invite, new { invite.Code });

        return OkResponse(new { invite.Code });
    }
    
    [HttpDelete("{id}/invite")]
    public async Task<IActionResult> DeleteInvite(long id, CancellationToken cancellationToken)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.ManageServer))
        {
            return ForbidResponse("You don't have permission to delete invites.");
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var invite = await dbContext.Invites.FindAsync([id], cancellationToken);
        if (invite == null) return NotFoundResponse("Invite not found.");

        dbContext.Invites.Remove(invite);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit log bejegyzés a meghívó törléséről
        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.InviteDeleted, null, AuditLogTargetType.Invite, new { invite.Code });

        return OkResponse("Invite deleted successfully.");
    }
    
    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveServer(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null) return NotFoundResponse("Server not found.");
        
        if (server.OwnerId == CurrentUserId)
        {
            return BadRequestResponse("Server owner cannot leave. Delete the server instead.");
        }

        var membership = await dbContext.ServerMembers
            .FirstOrDefaultAsync(sm => sm.ServerId == id && sm.UserId == CurrentUserId, cancellationToken);

        if (membership == null) return BadRequestResponse("You are not a member of this server.");

        dbContext.ServerMembers.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerMemberLeft, CurrentUserId, AuditLogTargetType.User, reason: "User left the server.");

        return OkResponse("Successfully left the server.");
    }
    
    [HttpGet("{id}/channels")]
    public async Task<IActionResult> GetChannels(long id, CancellationToken cancellationToken)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.ViewChannels))
        {
            return ForbidResponse();
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var channels = await dbContext.Channels
            .Where(c => c.ServerId == id)
            .OrderBy(c => c.Position)
            .Select(c => new ChannelDtos.ChannelListItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Type = c.Type,
                Position = c.Position
            })
            .ToListAsync(cancellationToken);

        return OkResponse(channels);
    }
    
    [HttpPost("{id}/channels")]
    public async Task<IActionResult> CreateChannel(long id, [FromBody] ChannelDtos.CreateChannelRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequestResponse("Invalid request data.");
        
        if (!await this.HasPermissionForServerAsync(DbContextFactory, id, Permission.ManageChannels))
        {
            return ForbidResponse();
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null) return NotFoundResponse("Server not found.");

        var channel = new Channel
        {
            ServerId = id,
            Name = request.Name,
            Description = request.Description,
            Type = request.Type,
            Position = (await dbContext.Channels.Where(c => c.ServerId == id).MaxAsync(c => (int?)c.Position, cancellationToken) ?? -1) + 1,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            UpdatedAt = SystemClock.Instance.GetCurrentInstant(),
            Server = server
        };

        dbContext.Channels.Add(channel);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ChannelCreated, channel.Id, AuditLogTargetType.Channel, new { channel.Name, channel.Type });
        
        var channelDto = new ChannelDtos.ChannelListItemDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Type = channel.Type,
            Position = channel.Position
        };
        
        return OkResponse(channelDto, "Channel created successfully.");
    }
    
    [HttpGet("public")]
    public async Task<IActionResult> GetPublicServers(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var servers = await dbContext.Servers
            .Where(s => s.Public)
            .Select(s => new ServerDtos.ServerListItemDto
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description ?? string.Empty,
                Icon = s.Icon,
                MemberCount = s.Members.Count,
                OwnerId = s.OwnerId,
                Public = s.Public,
                CreatedAt = s.CreatedAt,
                IsOwner = s.OwnerId == CurrentUserId
            })
            .OrderByDescending(s => s.MemberCount)
            .ToListAsync(cancellationToken);

        return OkResponse(servers);
    }
    
    [HttpPost("{id}/join")]
    public async Task<IActionResult> JoinPublicServer(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null) return NotFoundResponse("Server not found.");
        
        if (!server.Public) return ForbidResponse("This server is not public. You need an invite to join.");
        
        if (await dbContext.ServerMembers.AnyAsync(sm => sm.ServerId == id && sm.UserId == CurrentUserId, cancellationToken))
        {
            return BadRequestResponse("You are already a member of this server.");
        }

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null) return Unauthorized();

        var everyoneRole = await dbContext.Roles.FirstAsync(r => r.ServerId == id && r.Name == "@everyone", cancellationToken);
        
        var newMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = SystemClock.Instance.GetCurrentInstant()
        };
        newMember.Roles.Add(everyoneRole);

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerMemberJoined, CurrentUserId, AuditLogTargetType.User, new { server.Name });

        return OkResponse(new { ServerId = server.Id }, "Successfully joined server.");
    }
}