using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

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
        
        // Message kapcsolat (nullable)
        builder.HasOne(x => x.Message)
            .WithMany(x => x.ModerationLogs)
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Server kapcsolat (nullable)
        builder.HasOne(x => x.Server)
            .WithMany()
            .HasForeignKey(x => x.ServerId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(x => x.Moderator)
            .WithMany(x => x.ModerationActions)
            .HasForeignKey(x => x.ModeratorId)
            .OnDelete(DeleteBehavior.Restrict); // Moderator törlése ne törölje a log-okat
    }
}