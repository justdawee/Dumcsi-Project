using Dumcsi.Backend.Models.Enums;
using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

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

    // JSON string storing the changes made.
    // Example: {"Name": {"Old": "old-name", "New": "new-name"}}
    public string? Changes { get; set; }

    public string? Reason { get; set; }
    
    public Instant CreatedAt { get; set; }
}
