using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

public class ModerationLog
{
    public long Id { get; set; }

    public long MessageId { get; set; }
    
    public required Message Message { get; set; }

    public long ModeratorId { get; set; }

    public required User Moderator { get; set; }
    
    public required string Action { get; set; } // Pl. 'HideMessage', 'SilenceUser'
    
    public string? Reason { get; set; }

    public Instant CreatedAt { get; set; }
}

public class ModerationLogConfiguration : IEntityTypeConfiguration<ModerationLog>
{
    public void Configure(EntityTypeBuilder<ModerationLog> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Action)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.Property(x => x.Reason)
            .HasMaxLength(500);
        
        builder.HasOne(x => x.Message)
            .WithMany(x => x.ModerationLogs)
            .HasForeignKey(x => x.MessageId);
        
        builder.HasOne(x => x.Moderator)
            .WithMany(x => x.ModerationActions)
            .HasForeignKey(x => x.ModeratorId);
    }
}