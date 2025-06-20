using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.FileUrl)
            .IsRequired()
            .HasMaxLength(256); // URL méretkorlát
        
        builder.Property(x => x.FileName)
            .IsRequired()
            .HasMaxLength(256); // Fájlnév méretkorlát
        
        builder.Property(x => x.FileType)
            .IsRequired()
            .HasMaxLength(50); // Fájltípus méretkorlát
        
        builder.HasOne(x => x.Message)
            .WithMany(x => x.Attachments)
            .HasForeignKey(x => x.MessageId);
    }
}