using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class AuditLogEntryConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Changes)
            .HasColumnType("jsonb");

        builder.HasOne(x => x.Server)
            .WithMany()
            .HasForeignKey(x => x.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Executor)
            .WithMany() // Egy felhasználónak több naplóbejegyzése lehet
            .HasForeignKey(x => x.ExecutorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}