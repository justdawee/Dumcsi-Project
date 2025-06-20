using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Attachment
{
    public long Id { get; set; }

    public long MessageId { get; set; }

    public required Message Message { get; set; }
    
    public required string FileUrl { get; set; }
    
    public required string FileName { get; set; }
    
    public required string FileType { get; set; } // MIME type

    public int FileSizeInBytes { get; set; }
    
    public Instant CreatedAt { get; set; }
    
}