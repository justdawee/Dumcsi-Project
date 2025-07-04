using System.Text.Json;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Domain.Entities;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Infrastructure.Services;

public class AuditLogService(IDbContextFactory<DumcsiDbContext> dbContextFactory) : IAuditLogService
{
    public async Task LogAsync(long serverId, long executorId, AuditLogActionType action, long? targetId, AuditLogTargetType? targetType, object? changes = null, string? reason = null)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var server = await dbContext.Servers.FindAsync(serverId);
        var executor = await dbContext.Users.FindAsync(executorId);

        if (server == null || executor == null)
        {
            // Nem naplózunk, ha a szerver vagy a végrehajtó nem létezik.
            // Itt lehetne egy komolyabb hiba-logolás is.
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