using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FileName)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(x => x.FileUrl)
            .IsRequired()
            .HasMaxLength(2048);

        builder.Property(x => x.ContentType)
            .HasMaxLength(128);

        builder.Property(x => x.Title)
            .HasMaxLength(256);

        builder.Property(x => x.Waveform)
            .HasColumnType("text");
    }
}