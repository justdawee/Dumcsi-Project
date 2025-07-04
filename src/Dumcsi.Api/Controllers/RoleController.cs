using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server/{serverId}/roles")]
public class RoleController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    private async Task<bool> HasPermissionAsync(long serverId, Permission requiredPermission)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        
        var member = await dbContext.ServerMembers
            .AsNoTracking()
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(m => m.UserId == userId && m.ServerId == serverId);

        if (member == null) return false;

        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

        if (permissions.HasFlag(Permission.Administrator)) return true;
        
        return permissions.HasFlag(requiredPermission);
    }
    
    [HttpGet]
    public async Task<IActionResult> GetRoles(long serverId, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageRoles))
        {
            return Forbid("You do not have permission to view roles.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var roles = await dbContext.Roles
            .Where(r => r.ServerId == serverId)
            .OrderBy(r => r.Position)
            .Select(r => new ServerDtos.RoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Color = r.Color,
                Position = r.Position,
                Permissions = r.Permissions
            })
            .ToListAsync(cancellationToken);
            
        return Ok(roles);
    }
    
    [HttpPost]
    public async Task<IActionResult> CreateRole(long serverId, [FromBody] RoleDtos.CreateRoleRequestDto request, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageRoles))
        {
            return Forbid("You do not have permission to create roles.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var server = await dbContext.Servers.FindAsync([serverId], cancellationToken);
        if (server == null)
        {
            return NotFound("Server not found.");
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
            CreatedAt = NodaTime.SystemClock.Instance.GetCurrentInstant(),
            Server = server
        };
        

        dbContext.Roles.Add(newRole);
        await dbContext.SaveChangesAsync(cancellationToken);

        var roleDto = new ServerDtos.RoleDto
        {
            Id = newRole.Id,
            Name = newRole.Name,
            Color = newRole.Color,
            Position = newRole.Position,
            Permissions = newRole.Permissions
        };

        return CreatedAtAction(nameof(GetRoles), new { serverId }, roleDto);
    }
    
    [HttpPatch("{roleId}")]
    public async Task<IActionResult> UpdateRole(long serverId, long roleId, [FromBody] RoleDtos.UpdateRoleRequestDto request, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageRoles))
        {
            return Forbid("You do not have permission to update roles.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Id == roleId && r.ServerId == serverId, cancellationToken);
        if (role == null)
        {
            return NotFound("Role not found.");
        }

        // "@everyone" szerepkör nevét nem lehet módosítani.
        if (role.Name == "@everyone")
        {
            request.Name = null;
        }

        if (request.Name != null) role.Name = request.Name;
        if (request.Color != null) role.Color = request.Color;
        if (request.Permissions.HasValue) role.Permissions = request.Permissions.Value;
        if (request.Position.HasValue) role.Position = request.Position.Value;
        if (request.IsHoisted.HasValue) role.IsHoisted = request.IsHoisted.Value;
        if (request.IsMentionable.HasValue) role.IsMentionable = request.IsMentionable.Value;
        
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
    
    [HttpDelete("{roleId}")]
    public async Task<IActionResult> DeleteRole(long serverId, long roleId, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageRoles))
        {
            return Forbid("You do not have permission to delete roles.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Id == roleId && r.ServerId == serverId, cancellationToken);
        if (role == null)
        {
            return NotFound("Role not found.");
        }

        if (role.Name is "@everyone" or "Admin")
        {
            return BadRequest("Cannot delete default roles.");
        }

        dbContext.Roles.Remove(role);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
    
    [HttpPut("members/{memberId}/roles")]
    public async Task<IActionResult> UpdateMemberRoles(long serverId, long memberId, [FromBody] RoleDtos.UpdateMemberRolesRequestDto request, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(serverId, Permission.ManageRoles))
        {
            return Forbid("You do not have permission to manage member roles.");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var member = await dbContext.ServerMembers
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(m => m.UserId == memberId && m.ServerId == serverId, cancellationToken);
            
        if (member == null)
        {
            return NotFound("Member not found in this server.");
        }

        // A szerepköröket ID alapján töltjük be, hogy biztosan az adott szerverhez tartozzanak.
        var newRoles = await dbContext.Roles
            .Where(r => r.ServerId == serverId && request.RoleIds.Contains(r.Id))
            .ToListAsync(cancellationToken);
            
        // Biztosítjuk, hogy az @everyone szerepkör mindig ott legyen.
        var everyoneRole = await dbContext.Roles.FirstAsync(r => r.ServerId == serverId && r.Name == "@everyone", cancellationToken);
        if (!newRoles.Contains(everyoneRole))
        {
            newRoles.Add(everyoneRole);
        }

        member.Roles = newRoles;
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}