using Dumcsi.Api.Common;
using Dumcsi.Api.Helpers;
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
public class AuditLogController(IDbContextFactory<DumcsiDbContext> dbContextFactory) 
    : BaseApiController(dbContextFactory)
{
    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(long serverId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        if (!await this.HasPermissionForServerAsync(DbContextFactory, serverId, Permission.ViewAuditLog))
        {
            return StatusCode(403, ApiResponse.Fail("AUDIT_LOG_FORBIDDEN", "You do not have permission to view the audit log."));
        }
        
        if (pageSize > 100) pageSize = 100;

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

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

        return OkResponse(logs);
    }
}