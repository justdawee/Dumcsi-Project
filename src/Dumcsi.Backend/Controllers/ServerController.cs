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
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/server")]
public class ServerController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IServerSetupService serverSetupService,
    IPermissionService permissionService,
    IFileStorageService fileStorageService,
    IHubContext<ChatHub> chatHubContext)
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
    public async Task<IActionResult> CreateServer([FromBody] ServerDtos.CreateServerRequestDto request,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null)
        {
            return Unauthorized(ApiResponse.Fail("AUTH_USER_NOT_FOUND", "Authenticated user could not be found."));
        }

        var server = await serverSetupService.CreateNewServerAsync(user, request.Name, request.Description,
            request.Public, cancellationToken);

        var serverDto = new ServerDtos.ServerListItemDto
        {
            Id = server.Id,
            Name = server.Name,
            Description = server.Description,
            Icon = server.Icon,
            MemberCount = 1,
            OwnerId = server.OwnerId,
            IsOwner = true,
            Public = server.Public,
            CreatedAt = server.CreatedAt
        };

        await chatHubContext.Clients
            .User(server.OwnerId.ToString())
            .SendAsync("ServerCreated", serverDto, cancellationToken);

        return OkResponse(new { ServerId = server.Id }, "Server created successfully.");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetServerById(long id, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ViewChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_FORBIDDEN_VIEW", "You do not have permission to view this server."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers
            .AsNoTracking()
            .Include(s => s.Owner)
            .Include(s => s.Channels)
            .Include(s => s.Topics)
            .ThenInclude(t => t.Channels)
            .Include(s =>
                s.Members.Where(m => m.UserId == CurrentUserId))
            .ThenInclude(m => m.Roles)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        
        if (server != null)
        {
            server.Channels = server.Channels.OrderBy(c => c.Position).ToList();
            server.Topics = server.Topics.OrderBy(t => t.Position).ToList();
            foreach (var topic in server.Topics)
            {
                topic.Channels = topic.Channels.OrderBy(c => c.Position).ToList();
            }
        }

        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The requested server does not exist."));
        }

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
                Position = c.Position,
                ServerId = c.ServerId,
                TopicId = c.TopicId
            }).ToList(),
            Topics = server.Topics.Select(t => new TopicDtos.TopicListItemDto
            {
                Id = t.Id,
                ServerId = t.ServerId,
                Name = t.Name,
                Position = t.Position,
                Channels = t.Channels.Select(c => new ChannelDtos.ChannelListItemDto
                {
                    Id = c.Id,
                    ServerId = c.ServerId,
                    TopicId = c.TopicId,
                    Name = c.Name,
                    Type = c.Type,
                    Position = c.Position
                }).ToList()
            }).ToList()
        };

        return OkResponse(response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateServer(long id, [FromBody] ServerDtos.UpdateServerRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("SERVER_UPDATE_INVALID_DATA",
                "The provided data for updating the server is invalid."));
        }

        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ManageServer))
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_FORBIDDEN_MANAGE", "You do not have permission to manage this server."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server to update does not exist."));
        }

        if (server.OwnerId != CurrentUserId)
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_FORBIDDEN_NOT_OWNER", "Only the server owner can update the server."));
        }

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

        var serverDto = new ServerDtos.ServerListItemDto
        {
            Id = server.Id,
            Name = server.Name,
            Description = server.Description,
            Icon = server.Icon,
            Public = server.Public
        };
        await chatHubContext.Clients.All.SendAsync("ServerUpdated", serverDto, cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerUpdated, id,
            AuditLogTargetType.Server, changes);

        return OkResponse("Server updated successfully.");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteServer(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server to delete does not exist."));
        }

        if (server.OwnerId != CurrentUserId)
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_FORBIDDEN_NOT_OWNER", "Only the server owner can delete the server."));
        }

        dbContext.Servers.Remove(server);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerDeleted, id,
            AuditLogTargetType.Server);

        await chatHubContext.Clients.All.SendAsync("ServerDeleted", id, cancellationToken);

        return OkResponse("Server deleted successfully.");
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetServerMembers(long id, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ViewChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_MEMBERS_FORBIDDEN_VIEW",
                    "You do not have permission to view server members."));
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
                GlobalNickname = sm.User.GlobalNickname,
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

    [HttpPost("{id}/transfer-ownership")]
    public async Task<IActionResult> TransferOwnership(long id,
        [FromBody] ServerDtos.TransferOwnershipRequestDto request, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.Include(s => s.Members)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server does not exist."));
        }

        if (server.OwnerId != CurrentUserId)
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_FORBIDDEN_NOT_OWNER", "Only the server owner can transfer ownership."));
        }

        if (request.NewOwnerId == CurrentUserId)
        {
            return BadRequest(ApiResponse.Fail("SERVER_TRANSFER_SAME_OWNER",
                "You are already the owner of this server."));
        }

        if (!server.Members.Any(m => m.UserId == request.NewOwnerId))
        {
            return BadRequest(ApiResponse.Fail("SERVER_TRANSFER_NOT_MEMBER",
                "The selected user is not a member of this server."));
        }

        server.OwnerId = request.NewOwnerId;
        server.UpdatedAt = SystemClock.Instance.GetCurrentInstant();
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerOwnershipTransferred,
            request.NewOwnerId, AuditLogTargetType.User);

        var serverDto = new ServerDtos.ServerListItemDto
        {
            Id = server.Id,
            Name = server.Name,
            Description = server.Description,
            Icon = server.Icon,
            Public = server.Public
        };

        await chatHubContext.Clients.All.SendAsync("ServerUpdated", serverDto, cancellationToken);

        return OkResponse("Server ownership transferred.");
    }

    [HttpPost("{id}/invite")]
    public async Task<IActionResult> CreateInvite(long id, [FromBody] InviteDtos.CreateInviteRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.CreateInvite))
        {
            return StatusCode(403,
                ApiResponse.Fail("INVITE_FORBIDDEN_CREATE", "You don't have permission to create invites."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        var creator = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);

        if (server == null || creator == null)
        {
            return NotFound(ApiResponse.Fail("INVITE_CREATE_PREREQUISITES_NOT_FOUND", "Server or creator not found."));
        }

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

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.InviteCreated, null,
            AuditLogTargetType.Invite, new { invite.Code });

        return OkResponse(new { invite.Code });
    }

    [HttpDelete("{id}/invite")]
    public async Task<IActionResult> DeleteInvite(long id, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ManageServer))
        {
            return StatusCode(403,
                ApiResponse.Fail("INVITE_FORBIDDEN_DELETE", "You don't have permission to delete invites."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var invite = await dbContext.Invites.FindAsync([id], cancellationToken);
        if (invite == null)
        {
            return NotFound(ApiResponse.Fail("INVITE_NOT_FOUND", "Invite not found."));
        }

        dbContext.Invites.Remove(invite);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.InviteDeleted, null,
            AuditLogTargetType.Invite, new { invite.Code });

        return OkResponse("Invite deleted successfully.");
    }

    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveServer(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server to leave does not exist."));
        }

        if (server.OwnerId == CurrentUserId)
        {
            return BadRequest(ApiResponse.Fail("SERVER_OWNER_CANNOT_LEAVE",
                "Server owner cannot leave. Delete the server instead."));
        }

        var membership = await dbContext.ServerMembers
            .FirstOrDefaultAsync(sm => sm.ServerId == id && sm.UserId == CurrentUserId, cancellationToken);

        if (membership == null)
        {
            return BadRequest(ApiResponse.Fail("SERVER_LEAVE_NOT_MEMBER", "You are not a member of this server."));
        }

        dbContext.ServerMembers.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerMemberLeft, CurrentUserId,
            AuditLogTargetType.User, reason: "User left the server.");

        await chatHubContext.Clients.Group(id.ToString()).SendAsync("UserLeftServer",
            new { UserId = CurrentUserId, ServerId = id }, cancellationToken: cancellationToken);

        return OkResponse("Successfully left the server.");
    }

    [HttpGet("{id}/channels")]
    public async Task<IActionResult> GetChannels(long id, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ViewChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("CHANNEL_LIST_FORBIDDEN_VIEW",
                    "You do not have permission to view channels on this server."));
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
                Position = c.Position,
                ServerId = c.ServerId,
                TopicId = c.TopicId
            })
            .ToListAsync(cancellationToken);

        return OkResponse(channels);
    }

    [HttpPost("{id}/channels")]
    public async Task<IActionResult> CreateChannel(long id, [FromBody] ChannelDtos.CreateChannelRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("CHANNEL_CREATE_INVALID_DATA",
                "The provided data for creating a channel is invalid."));
        }

        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ManageChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("CHANNEL_FORBIDDEN_CREATE",
                    "You do not have permission to create channels on this server."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server to add the channel to does not exist."));
        }

        var channel = new Channel
        {
            ServerId = id,
            TopicId = request.TopicId,
            Name = request.Name,
            Description = request.Description,
            Type = request.Type,
            Position = (await dbContext.Channels.Where(c => c.ServerId == id)
                .MaxAsync(c => (int?)c.Position, cancellationToken) ?? -1) + 1,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            UpdatedAt = SystemClock.Instance.GetCurrentInstant(),
            Server = server
        };

        dbContext.Channels.Add(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ChannelCreated, channel.Id,
            AuditLogTargetType.Channel, new { channel.Name, channel.Type });

        var channelDto = new ChannelDtos.ChannelListItemDto
        {
            Id = channel.Id,
            ServerId = channel.ServerId,
            TopicId = channel.TopicId,
            Name = channel.Name,
            Type = channel.Type,
            Position = channel.Position
        };

        await chatHubContext.Clients.Group(id.ToString())
            .SendAsync("ChannelCreated", channelDto, cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetChannels), new { id },
            ApiResponse<ChannelDtos.ChannelListItemDto>.Success(channelDto, "Channel created successfully."));
    }

    [HttpGet("{id}/topics")]
    public async Task<IActionResult> GetTopics(long id, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ViewChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("TOPIC_LIST_FORBIDDEN_VIEW",
                    "You do not have permission to view topics on this server."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var topics = await dbContext.Topics
            .Where(t => t.ServerId == id)
            .Include(t => t.Channels.OrderBy(c => c.Position))
            .OrderBy(t => t.Position)
            .Select(t => new TopicDtos.TopicListItemDto
            {
                Id = t.Id,
                ServerId = t.ServerId,
                Name = t.Name,
                Position = t.Position,
                Channels = t.Channels.Select(c => new ChannelDtos.ChannelListItemDto
                {
                    Id = c.Id,
                    ServerId = c.ServerId,
                    TopicId = c.TopicId,
                    Name = c.Name,
                    Type = c.Type,
                    Position = c.Position
                }).ToList()
            })
            .ToListAsync(cancellationToken);

        return OkResponse(topics);
    }

    [HttpPost("{id}/topics")]
    public async Task<IActionResult> CreateTopic(long id, [FromBody] TopicDtos.CreateTopicRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("TOPIC_CREATE_INVALID_DATA",
                "The provided data for creating a topic is invalid."));
        }

        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, id, Permission.ManageChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("TOPIC_FORBIDDEN_CREATE",
                    "You do not have permission to create topics on this server."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([id], cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server to add the topic to does not exist."));
        }

        var topic = new Topic
        {
            ServerId = id,
            Name = request.Name,
            Position = (await dbContext.Topics.Where(t => t.ServerId == id)
                .MaxAsync(t => (int?)t.Position, cancellationToken) ?? -1) + 1,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            UpdatedAt = SystemClock.Instance.GetCurrentInstant(),
            Server = server
        };

        dbContext.Topics.Add(topic);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.TopicCreated, topic.Id,
            AuditLogTargetType.Topic, new { topic.Name });

        var topicDto = new TopicDtos.TopicListItemDto
        {
            Id = topic.Id,
            ServerId = topic.ServerId,
            Name = topic.Name,
            Position = topic.Position,
            Channels = new List<ChannelDtos.ChannelListItemDto>()
        };

        await chatHubContext.Clients.Group(id.ToString())
            .SendAsync("TopicCreated", topicDto, cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetTopics), new { id },
            ApiResponse<TopicDtos.TopicListItemDto>.Success(topicDto, "Topic created successfully."));
    }

    [HttpPatch("topics/{topicId}")]
    public async Task<IActionResult> UpdateTopic(long topicId, [FromBody] TopicDtos.UpdateTopicRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("TOPIC_UPDATE_INVALID_DATA",
                "The provided data for updating the topic is invalid."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var topic = await dbContext.Topics.Include(t => t.Server)
            .Include(t => t.Channels)
            .FirstOrDefaultAsync(t => t.Id == topicId, cancellationToken);
        
        if (topic == null)
        {
            return NotFound(ApiResponse.Fail("TOPIC_NOT_FOUND", "The topic to update does not exist."));
        }

        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, topic.ServerId,
                Permission.ManageChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("TOPIC_FORBIDDEN_MANAGE", "You do not have permission to manage this topic."));
        }

        var oldValues = new { topic.Name, topic.Position };

        if (request.Name != null) topic.Name = request.Name;
        if (request.Position.HasValue) topic.Position = request.Position.Value;
        topic.UpdatedAt = SystemClock.Instance.GetCurrentInstant();

        await dbContext.SaveChangesAsync(cancellationToken);

        var changes = new
        {
            Name = new { Old = oldValues.Name, New = topic.Name },
            Position = new { Old = oldValues.Position, New = topic.Position }
        };

        var topicDto = new TopicDtos.TopicListItemDto
        {
            Id = topic.Id,
            ServerId = topic.ServerId,
            Name = topic.Name,
            Position = topic.Position,
            Channels = topic.Channels.OrderBy(c => c.Position).Select(c => new ChannelDtos.ChannelListItemDto
            {
                Id = c.Id,
                ServerId = c.ServerId,
                TopicId = c.TopicId,
                Name = c.Name,
                Type = c.Type,
                Position = c.Position
            }).ToList()
        };

        await auditLogService.LogAsync(topic.ServerId, CurrentUserId, AuditLogActionType.TopicUpdated, topic.Id,
            AuditLogTargetType.Topic, changes);
        await chatHubContext.Clients.Group(topic.ServerId.ToString())
            .SendAsync("TopicUpdated", topicDto, cancellationToken);

        return OkResponse("Topic updated successfully.");
    }

    [HttpDelete("topics/{topicId}")]
    public async Task<IActionResult> DeleteTopic(long topicId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var topic = await dbContext.Topics.Include(t => t.Server)
            .FirstOrDefaultAsync(t => t.Id == topicId, cancellationToken);
        if (topic == null)
        {
            return NotFound(ApiResponse.Fail("TOPIC_NOT_FOUND", "The topic to delete does not exist."));
        }

        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, topic.ServerId,
                Permission.ManageChannels))
        {
            return StatusCode(403,
                ApiResponse.Fail("TOPIC_FORBIDDEN_DELETE", "You do not have permission to delete this topic."));
        }

        var serverId = topic.ServerId;
        var topicName = topic.Name;

        dbContext.Topics.Remove(topic);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.TopicDeleted, topicId,
            AuditLogTargetType.Topic, new { topicName });
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("TopicDeleted",
            new { TopicId = topicId, ServerId = serverId }, cancellationToken);

        return OkResponse("Topic deleted successfully.");
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
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "The server to join does not exist."));
        }

        if (!server.Public)
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_JOIN_NOT_PUBLIC", "This server is not public. You need an invite to join."));
        }

        if (await dbContext.ServerMembers.AnyAsync(sm => sm.ServerId == id && sm.UserId == CurrentUserId,
                cancellationToken))
        {
            return BadRequest(
                ApiResponse.Fail("SERVER_JOIN_ALREADY_MEMBER", "You are already a member of this server."));
        }

        var user = await dbContext.Users.FindAsync([CurrentUserId], cancellationToken);
        if (user == null)
        {
            return Unauthorized(ApiResponse.Fail("AUTH_USER_NOT_FOUND", "Authenticated user could not be found."));
        }

        var everyoneRole =
            await dbContext.Roles.FirstAsync(r => r.ServerId == id && r.Name == "@everyone", cancellationToken);

        var newMember = new ServerMember
        {
            User = user,
            Server = server,
            JoinedAt = SystemClock.Instance.GetCurrentInstant()
        };
        newMember.Roles.Add(everyoneRole);

        dbContext.ServerMembers.Add(newMember);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(id, CurrentUserId, AuditLogActionType.ServerMemberJoined, CurrentUserId,
            AuditLogTargetType.User, new { server.Name });

        var userDto = new UserDtos.UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            GlobalNickname = user.GlobalNickname,
            Avatar = user.Avatar
        };

        await chatHubContext.Clients.Group(id.ToString()).SendAsync("UserJoinedServer",
            new { User = userDto, ServerId = id }, cancellationToken: cancellationToken);

        return OkResponse(new { ServerId = server.Id }, "Successfully joined server.");
    }

    [HttpPost("{serverId}/icon")]
    public async Task<IActionResult> UploadOrUpdateServerIcon(long serverId, IFormFile? file)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageServer))
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_ICON_FORBIDDEN_MANAGE",
                    "You do not have permission to manage this server's icon."));
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse.Fail("SERVER_ICON_FILE_MISSING", "No file uploaded."));
        }

        if (file.Length > 20 * 1024 * 1024) // max 20MB
        {
            return BadRequest(ApiResponse.Fail("SERVER_ICON_FILE_TOO_LARGE", "File size cannot exceed 20MB."));
        }

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            return BadRequest(ApiResponse.Fail("SERVER_ICON_INVALID_FILE_TYPE",
                "Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync();
        var server = await dbContext.Servers.FindAsync(serverId);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "Server not found."));
        }

        try
        {
            using var image = await Image.LoadAsync(file.OpenReadStream());

            if (image.Width > 1024 || image.Height > 1024)
            {
                return BadRequest(ApiResponse.Fail("SERVER_ICON_INVALID_DIMENSIONS",
                    "Image dimensions cannot exceed 1024x1024 pixels."));
            }

            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(512, 512),
                Mode = ResizeMode.Crop
            }));

            await using var memoryStream = new MemoryStream();
            await image.SaveAsPngAsync(memoryStream);
            memoryStream.Position = 0;

            if (!string.IsNullOrEmpty(server.Icon))
            {
                try
                {
                    var oldFileName = Path.GetFileName(new Uri(server.Icon).LocalPath);
                    await fileStorageService.DeleteFileAsync(oldFileName);
                }
                catch
                {
                    // Log this error but don't fail the operation
                }
            }

            var newIconUrl =
                await fileStorageService.UploadFileAsync(memoryStream, $"{serverId}_icon.png", "image/png");

            server.Icon = newIconUrl;
            server.UpdatedAt = SystemClock.Instance.GetCurrentInstant();
            await dbContext.SaveChangesAsync();

            await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.ServerUpdated, serverId,
                AuditLogTargetType.Server, new { IconChanged = newIconUrl });

            var serverDto = new ServerDtos.ServerListItemDto
            {
                Id = server.Id,
                Name = server.Name,
                Description = server.Description,
                Icon = newIconUrl,
                Public = server.Public
            };

            await chatHubContext.Clients.All.SendAsync("ServerUpdated", serverDto);

            return OkResponse(new { url = newIconUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500,
                ApiResponse.Fail("SERVER_ICON_PROCESSING_ERROR",
                    $"An error occurred while processing the image: {ex.Message}"));
        }
    }

    [HttpDelete("{serverId}/icon")]
    public async Task<IActionResult> DeleteServerIcon(long serverId)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageServer))
        {
            return StatusCode(403,
                ApiResponse.Fail("SERVER_ICON_FORBIDDEN_MANAGE",
                    "You do not have permission to manage this server's icon."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync();
        var server = await dbContext.Servers.FindAsync(serverId);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("SERVER_NOT_FOUND", "Server not found."));
        }

        if (string.IsNullOrEmpty(server.Icon))
        {
            return OkResponse("Server has no icon to delete.");
        }

        var oldIconUrl = server.Icon;

        try
        {
            var fileName = Path.GetFileName(new Uri(oldIconUrl).LocalPath);
            await fileStorageService.DeleteFileAsync(fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500,
                ApiResponse.Fail("SERVER_ICON_DELETE_ERROR", $"Failed to delete server icon: {ex.Message}"));
        }

        server.Icon = null;
        server.UpdatedAt = SystemClock.Instance.GetCurrentInstant();
        await dbContext.SaveChangesAsync();

        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.ServerUpdated, serverId,
            AuditLogTargetType.Server, new { IconRemoved = oldIconUrl });

        var serverDto = new ServerDtos.ServerListItemDto
        {
            Id = server.Id,
            Name = server.Name,
            Description = server.Description,
            Icon = null,
            Public = server.Public
        };

        await chatHubContext.Clients.All.SendAsync("ServerUpdated", serverDto);

        return OkResponse("Server icon deleted successfully.");
    }
}
