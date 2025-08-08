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

[Authorize]
[ApiController]
[Route("api/server/{serverId}/roles")]
public class RoleController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IAuditLogService auditLogService,
    IPermissionService permissionService,
    IHubContext<ChatHub> chatHubContext)
    : BaseApiController(dbContextFactory)
{
    [HttpGet]
    public async Task<IActionResult> GetRoles(long serverId, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageRoles))
        {
            return StatusCode(403, ApiResponse.Fail("ROLE_FORBIDDEN_VIEW", "You do not have permission to view roles."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var roles = await dbContext.Roles
            .Where(r => r.ServerId == serverId)
            .OrderBy(r => r.Position)
            .Select(r => new ServerDtos.RoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Color = r.Color,
                Position = r.Position,
                Permissions = r.Permissions,
                IsHoisted = r.IsHoisted,
                IsMentionable = r.IsMentionable
            })
            .ToListAsync(cancellationToken);

        return OkResponse(roles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole(long serverId, [FromBody] RoleDtos.CreateRoleRequestDto request, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageRoles))
        {
            return StatusCode(403, ApiResponse.Fail("ROLE_FORBIDDEN_CREATE", "You do not have permission to create roles."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var server = await dbContext.Servers.FindAsync([serverId], cancellationToken);
        if (server == null)
        {
            return NotFound(ApiResponse.Fail("ROLE_SERVER_NOT_FOUND", "The server to add the role to does not exist."));
        }

        var highestPosition = await dbContext.Roles
                                  .Where(r => r.ServerId == serverId)
                                  .MaxAsync(r => (int?)r.Position, cancellationToken) ?? 0;

        var newRole = new Role
        {
            Name = request.Name,
            Color = request.Color,
            Permissions = request.Permissions,
            IsHoisted = request.IsHoisted,
            IsMentionable = request.IsMentionable,
            ServerId = serverId,
            Position = highestPosition + 1,
            CreatedAt = SystemClock.Instance.GetCurrentInstant(),
            Server = server
        };

        dbContext.Roles.Add(newRole);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.RoleCreated, newRole.Id, AuditLogTargetType.Role, new { newRole.Name, newRole.Permissions });

        var roleDto = new ServerDtos.RoleDto
        {
            Id = newRole.Id,
            Name = newRole.Name,
            Color = newRole.Color,
            Position = newRole.Position,
            Permissions = newRole.Permissions,
            IsHoisted = newRole.IsHoisted,
            IsMentionable = newRole.IsMentionable
        };
        
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("RoleCreated", roleDto, cancellationToken);
        
        return CreatedAtAction(nameof(GetRoles), new { serverId }, ApiResponse<ServerDtos.RoleDto>.Success(roleDto, "Role created successfully."));
    }

    [HttpPatch("{roleId}")]
    public async Task<IActionResult> UpdateRole(long serverId, long roleId, [FromBody] RoleDtos.UpdateRoleRequestDto request, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageRoles))
        {
            return StatusCode(403, ApiResponse.Fail("ROLE_FORBIDDEN_UPDATE", "You do not have permission to update roles."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Id == roleId && r.ServerId == serverId, cancellationToken);
        if (role == null)
        {
            return NotFound(ApiResponse.Fail("ROLE_NOT_FOUND", "The role to update does not exist."));
        }

        // Special handling for default roles
        if (role.Name == "@everyone")
        {
            // Only allow permission updates for default roles
            if (request.Name != null)
            {
                return BadRequest(ApiResponse.Fail("ROLE_CANNOT_MODIFY_DEFAULT", "Cannot modify the name of the '@everyone' role."));
            }
        }

        var oldRole = new { role.Name, role.Color, role.Permissions, role.Position };

        if (request.Name != null && role.Name != "@everyone")
            role.Name = request.Name;
        if (request.Color != null)
            role.Color = request.Color;
        if (request.Permissions.HasValue)
            role.Permissions = request.Permissions.Value;
        if (request.Position.HasValue && role.Name != "@everyone")
            role.Position = request.Position.Value;
        if (request.IsHoisted.HasValue)
            role.IsHoisted = request.IsHoisted.Value;
        if (request.IsMentionable.HasValue)
            role.IsMentionable = request.IsMentionable.Value;

        await dbContext.SaveChangesAsync(cancellationToken);

        var changes = new
        {
            OldName = oldRole.Name != role.Name ? oldRole.Name : null,
            NewName = oldRole.Name != role.Name ? role.Name : null,
            OldColor = oldRole.Color != role.Color ? oldRole.Color : null,
            NewColor = oldRole.Color != role.Color ? role.Color : null,
            OldPermissions = oldRole.Permissions != role.Permissions ? oldRole.Permissions : (Permission?)null,
            NewPermissions = oldRole.Permissions != role.Permissions ? role.Permissions : (Permission?)null,
        };

        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.RoleUpdated, role.Id, AuditLogTargetType.Role, changes);

        var roleDto = new ServerDtos.RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Color = role.Color,
            Position = role.Position,
            Permissions = role.Permissions,
            IsHoisted = role.IsHoisted,
            IsMentionable = role.IsMentionable
        };
        
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("RoleUpdated", roleDto, cancellationToken);
        
        return OkResponse<ServerDtos.RoleDto>(roleDto);
    }

    [HttpDelete("{roleId}")]
    public async Task<IActionResult> DeleteRole(long serverId, long roleId, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageRoles))
        {
            return StatusCode(403, ApiResponse.Fail("ROLE_FORBIDDEN_DELETE", "You do not have permission to delete roles."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Id == roleId && r.ServerId == serverId, cancellationToken);
        if (role == null)
        {
            return NotFound(ApiResponse.Fail("ROLE_NOT_FOUND", "The role to delete does not exist."));
        }

        if (role.Name == "@everyone")
        {
            return BadRequest(ApiResponse.Fail("ROLE_CANNOT_DELETE_DEFAULT", "The '@everyone' role cannot be deleted."));
        }

        var deletedRoleName = role.Name;

        dbContext.Roles.Remove(role);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.RoleDeleted, roleId, AuditLogTargetType.Role, new { Name = deletedRoleName });

        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("RoleDeleted", roleId, cancellationToken);
        
        return OkResponse("Role deleted successfully.");
    }

    [HttpPut("members/{memberId}/roles")]
    public async Task<IActionResult> UpdateMemberRoles(long serverId, long memberId, [FromBody] RoleDtos.UpdateMemberRolesRequestDto request, CancellationToken cancellationToken)
    {
        if (!await permissionService.HasPermissionForServerAsync(CurrentUserId, serverId, Permission.ManageRoles))
        {
            return StatusCode(403, ApiResponse.Fail("ROLE_FORBIDDEN_ASSIGN", "You do not have permission to manage member roles."));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var member = await dbContext.ServerMembers
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(m => m.UserId == memberId && m.ServerId == serverId, cancellationToken);

        if (member == null)
        {
            return NotFound(ApiResponse.Fail("ROLE_MEMBER_NOT_FOUND", "The specified member was not found in this server."));
        }

        var oldRoleIds = member.Roles.Select(r => r.Id).ToList();
        var newRoles = await dbContext.Roles
            .Where(r => r.ServerId == serverId && request.RoleIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        var everyoneRole = await dbContext.Roles.FirstAsync(r => r.ServerId == serverId && r.Name == "@everyone", cancellationToken);
        if (!newRoles.Contains(everyoneRole))
        {
            newRoles.Add(everyoneRole);
        }

        member.Roles = newRoles;
        await dbContext.SaveChangesAsync(cancellationToken);

        var changes = new {
            AddedRoles = newRoles.Where(r => !oldRoleIds.Contains(r.Id)).Select(r => r.Name).ToList(),
            RemovedRoles = await dbContext.Roles.Where(r => oldRoleIds.Contains(r.Id) && !newRoles.Contains(r)).Select(r => r.Name).ToListAsync(cancellationToken)
        };
        
        await auditLogService.LogAsync(serverId, CurrentUserId, AuditLogActionType.MemberRolesUpdated, memberId, AuditLogTargetType.User, changes);
        
        var newRolesDto = newRoles.Select(r => new ServerDtos.RoleDto {
            Id = r.Id,
            Name = r.Name,
            Color = r.Color,
            Position = r.Position,
            Permissions = r.Permissions,
            IsHoisted = r.IsHoisted,
            IsMentionable = r.IsMentionable
        }).ToList();
        
        var payload = new { ServerId = serverId, MemberId = memberId, Roles = newRolesDto };
        
        await chatHubContext.Clients.Group(serverId.ToString()).SendAsync("MemberRolesUpdated", payload, cancellationToken);
        
        return OkResponse("Member roles updated successfully.");
    }
}
