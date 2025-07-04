using System.Security.Claims;
using Dumcsi.Application.DTOs;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/server/{serverId}/audit-logs")]
public class AuditLogController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    private async Task<bool> HasPermissionAsync(long serverId, Permission requiredPermission)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var member = await dbContext.ServerMembers.AsNoTracking().Include(m => m.Roles).FirstOrDefaultAsync(m => m.UserId == userId && m.ServerId == serverId);
        if (member == null) return false;
        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);
        if (permissions.HasFlag(Permission.Administrator)) return true;
        return permissions.HasFlag(requiredPermission);
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(long serverId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        if (!await HasPermissionAsync(serverId, Permission.ViewAuditLog))
        {
            return Forbid("You do not have permission to view the audit log.");
        }

        if (pageSize > 100) pageSize = 100;

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var logs = await dbContext.AuditLogEntries
            .AsNoTracking()
            .Where(log => log.ServerId == serverId)
            .OrderByDescending(log => log.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new AuditLogDtos.AuditLogEntryDto
            {
                Id = log.Id,
                ExecutorId = log.ExecutorId,
                ExecutorUsername = log.Executor.Username,
                TargetId = log.TargetId,
                TargetType = log.TargetType,
                ActionType = log.ActionType,
                Changes = log.Changes,
                Reason = log.Reason,
                CreatedAt = log.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }
}