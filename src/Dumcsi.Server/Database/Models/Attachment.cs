using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

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

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.FileUrl)
            .IsRequired()
            .HasMaxLength(256); // URL length limit
        
        builder.Property(x => x.FileName)
            .IsRequired()
            .HasMaxLength(256); // Reasonable file name length
        
        builder.Property(x => x.FileType)
            .IsRequired()
            .HasMaxLength(50); // MIME type length
        
        builder.HasOne(x => x.Message)
            .WithMany(x => x.Attachments)
            .HasForeignKey(x => x.MessageId);
    }
}