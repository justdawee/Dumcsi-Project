using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.HasKey(m => m.Id);
        
        builder.Property(m => m.Content)
            .IsRequired();
        
        builder.Property(m => m.EditedAt)
            .IsRequired(false);
        
        builder.HasOne(message => message.Sender)
            .WithMany(user => user.SentMessages) 
            .HasForeignKey(message => message.SenderId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict); // User törlése ne törölje az üzeneteket

        builder.HasOne(message => message.Channel)  // ChatRoom → Channel
            .WithMany(channel => channel.Messages)
            .HasForeignKey(message => message.ChannelId)  // RoomId → ChannelId
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade); // Channel törlése törölje az üzeneteket
        
        builder.HasMany(message => message.Attachments)
            .WithOne(attachment => attachment.Message)
            .HasForeignKey(attachment => attachment.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasMany(message => message.ModerationLogs)
            .WithOne(log => log.Message)
            .HasForeignKey(log => log.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}