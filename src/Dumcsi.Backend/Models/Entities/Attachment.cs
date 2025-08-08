using NodaTime;

namespace Dumcsi.Backend.Models.Entities;

public class Attachment
{
    public long Id { get; set; }

    public required string FileName { get; set; } 
    
    public required string FileUrl { get; set; } // URL or filename
    
    public int FileSize { get; set; } // File size in bytes
    
    public string? ContentType { get; set; } // MIME type, e.g. "image/png", "application/pdf"
    
    public string? Title { get; set; } // File title, if available
    
    public int? height { get; set; } // Image height, if image file
    
    public int? width { get; set; } // Image width, if image file
    
    public string? Waveform { get; set; }
    
    public float? duration { get; set; } // Audio duration in seconds, if audio file
}
