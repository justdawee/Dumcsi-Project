using Dumcsi.Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Backend.Data.Configurations;

public class DmMessageConfig : IEntityTypeConfiguration<DmMessage>
{
    public void Configure(EntityTypeBuilder<DmMessage> builder)
    {
        builder.HasKey(dm => dm.Id);
        
        builder.HasOne(dm => dm.Sender)
            .WithMany()
            .HasForeignKey(dm => dm.SenderId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasOne(dm => dm.Receiver)
            .WithMany()
            .HasForeignKey(dm => dm.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);

        // Many-to-Many relationship for mentioned users
        builder.HasMany(dm => dm.MentionUsers)
            .WithMany()
            .UsingEntity(j => j.ToTable("DmMessageMentions"));

        // Many-to-Many relationship for attachments
        builder.HasMany(dm => dm.Attachments)
            .WithMany()
            .UsingEntity(j => j.ToTable("DmMessageAttachments"));

        builder.Property(dm => dm.Content)
            .HasMaxLength(4000);
    }
}
