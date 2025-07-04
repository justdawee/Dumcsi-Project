using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Application.DTOs;

public class AuditLogDtos
{
    public class AuditLogEntryDto
    {
        public long Id { get; set; }
        public long ExecutorId { get; set; }
        public string ExecutorUsername { get; set; } = string.Empty;
        public long? TargetId { get; set; }
        public AuditLogTargetType? TargetType { get; set; }
        public AuditLogActionType ActionType { get; set; }
        public string? Changes { get; set; } // A JSON stringet küldjük a kliensnek
        public string? Reason { get; set; }
        public Instant CreatedAt { get; set; }
    }
}