using System.Text.Json;
using Dumcsi.Backend.Services.Data;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Backend.Services.Data;

public class AuditLogService(IDbContextFactory<DumcsiDbContext> dbContextFactory) : IAuditLogService
{
    public async Task LogAsync(long serverId, long executorId, AuditLogActionType action, long? targetId, AuditLogTargetType? targetType, object? changes = null, string? reason = null)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var server = await dbContext.Servers.FindAsync(serverId);
        var executor = await dbContext.Users.FindAsync(executorId);

        if (server == null || executor == null)
        {
            // Skip logging if server or executor doesn't exist
            return;
        }

        var entry = new AuditLogEntry
        {
            Server = server,
            Executor = executor,
            ActionType = action,
            TargetId = targetId,
            TargetType = targetType,
            Changes = changes != null ? JsonSerializer.Serialize(changes) : null,
            Reason = reason,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        await dbContext.AuditLogEntries.AddAsync(entry);
        await dbContext.SaveChangesAsync();
    }
}
