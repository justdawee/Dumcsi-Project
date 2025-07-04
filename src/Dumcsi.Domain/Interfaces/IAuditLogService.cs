using Dumcsi.Domain.Enums;

namespace Dumcsi.Application.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(long serverId, long executorId, AuditLogActionType action, long? targetId, AuditLogTargetType? targetType, object? changes = null, string? reason = null);
}