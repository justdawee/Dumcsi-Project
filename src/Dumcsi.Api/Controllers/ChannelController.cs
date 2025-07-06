using Dumcsi.Api.Common;
using Dumcsi.Api.Helpers;
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
using NodaTime.Extensions;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/channels")]
public class ChannelController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IHubContext<ChatHub> chatHubContext)
    : BaseApiController(dbContextFactory)
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetChannel(long id, CancellationToken cancellationToken)
    {
        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, id, Permission.ViewChannels);
        if (!isMember) return ForbidResponse("You are not a member of this server.");
        if (!hasPermission) return ForbidResponse("You do not have permission to view this channel.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (channel == null)
        {
            return NotFoundResponse("Channel not found.");
        }

        // Itt egy egyszerűsített DTO-t adunk vissza, az üzenetek a MessageControlleren keresztül érhetők el.
        var response = new ChannelDtos.ChannelDetailDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            Position = channel.Position,
            CreatedAt = channel.CreatedAt
        };

        return OkResponse(response);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateChannel(long id, [FromBody] ChannelDtos.UpdateChannelRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequestResponse("Invalid request data.");
        }

        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, id, Permission.ManageChannels);
        if (!isMember) return ForbidResponse("You are not a member of this server.");
        if (!hasPermission) return ForbidResponse("You do not have permission to manage this channel.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (channel == null)
        {
            return NotFoundResponse("Channel not found.");
        }

        var oldValues = new { channel.Name, channel.Description, channel.Position };
        
        if (request.Name != null) channel.Name = request.Name;
        if (request.Description != null) channel.Description = request.Description;
        if (request.Position.HasValue) channel.Position = request.Position.Value;
        channel.UpdatedAt = SystemClock.Instance.GetCurrentInstant();
        
        await dbContext.SaveChangesAsync(cancellationToken);
        
        var changes = new {
            Name = new { Old = oldValues.Name, New = channel.Name },
            Description = new { Old = oldValues.Description, New = channel.Description },
            Position = new { Old = oldValues.Position, New = channel.Position }
        };
        
        var channelDto = new ChannelDtos.ChannelDetailDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            Position = channel.Position,
            CreatedAt = channel.CreatedAt
        };
        
        await auditLogService.LogAsync(channel.ServerId, CurrentUserId, AuditLogActionType.ChannelUpdated, channel.Id, AuditLogTargetType.Channel, changes);
        
        // Csak az adott szerver csoportjának küldjük!
        await chatHubContext.Clients.Group(channel.ServerId.ToString()).SendAsync("ChannelUpdated", channelDto, cancellationToken);

        return OkResponse("Channel updated successfully.");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteChannel(long id, CancellationToken cancellationToken)
    {
        var (isMember, hasPermission) = await this.CheckPermissionsForChannelAsync(DbContextFactory, id, Permission.ManageChannels);
        if (!isMember) return ForbidResponse("You are not a member of this server.");
        if (!hasPermission) return ForbidResponse("You do not have permission to delete this channel.");

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var channel = await dbContext.Channels.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (channel == null)
        {
            return NotFoundResponse("Channel not found.");
        }

        var deletedChannelName = channel.Name; // Mentsük a nevet a loghoz
        var serverId = channel.ServerId;

        dbContext.Channels.Remove(channel);
        await dbContext.SaveChangesAsync(cancellationToken);
        
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.ChannelDeleted, id, AuditLogTargetType.Channel, new { Name = deletedChannelName });

        // Csak az adott szerver csoportjának küldjük!
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("ChannelDeleted", new { ServerId = serverId, ChannelId = id }, cancellationToken);
        
        return OkResponse("Channel deleted successfully.");
    }
}