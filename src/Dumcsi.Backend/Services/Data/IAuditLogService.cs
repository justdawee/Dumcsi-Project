using Dumcsi.Backend.Models.Enums;

namespace Dumcsi.Backend.Services.Data;

public interface IAuditLogService
{
    Task LogAsync(long serverId, long executorId, AuditLogActionType action, long? targetId, AuditLogTargetType? targetType, object? changes = null, string? reason = null);
}
