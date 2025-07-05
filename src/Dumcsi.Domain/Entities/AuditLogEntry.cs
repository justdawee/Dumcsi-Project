using Dumcsi.Domain.Enums;
using NodaTime;

namespace Dumcsi.Domain.Entities;

public class AuditLogEntry
{
    public long Id { get; set; }

    public long ServerId { get; set; }
    
    public required Server Server { get; set; }
    
    public long ExecutorId { get; set; }
    
    public required User Executor { get; set; }
    
    public long? TargetId { get; set; }
    
    public AuditLogTargetType? TargetType { get; set; }

    public AuditLogActionType ActionType { get; set; }

    // A változásokat tároló JSON string.
    // Pl.: {"Name": {"Old": "régi-név", "New": "új-név"}}
    public string? Changes { get; set; }

    public string? Reason { get; set; }
    
    public Instant CreatedAt { get; set; }
}