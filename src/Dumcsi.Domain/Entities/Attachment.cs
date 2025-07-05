using NodaTime;

namespace Dumcsi.Domain.Entities;

public class Attachment
{
    public long Id { get; set; }

    public required string FileName { get; set; } 
    
    public required string FileUrl { get; set; } // URL vagy fájlnév, jövőben lehet saját fájltárolás is
    
    public int FileSize { get; set; } // Fájlméret bájtban
    
    public string? ContentType { get; set; } // MIME típus, pl. "image/png", "application/pdf"
    
    public string? Title { get; set; } // Fájl címe, ha van
    
    public int? height { get; set; } // Kép magassága, ha kép típusú fájl
    
    public int? width { get; set; } // Kép szélessége, ha kép típusú fájl
    
    public string? Waveform { get; set; }
    
    public float? duration { get; set; } // Hangfájl hossza másodpercben, ha hang típusú fájl
}