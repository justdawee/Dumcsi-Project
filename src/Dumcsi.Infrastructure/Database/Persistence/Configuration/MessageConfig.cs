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
        
        builder.HasOne(message => message.Sender)
            .WithMany(user => user.SentMessages) 
            .HasForeignKey(message => message.SenderId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict); // Ha egy usert törölnének, ne törlődjenek az üzenetei. Ez megakadályozza a törlést, amíg vannak üzenetei.
        
        builder.HasOne(message => message.ChatRoom)
            .WithMany(room => room.Messages)
            .HasForeignKey(message => message.RoomId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade); // Ha egy szoba törlődik, törlődjön vele minden üzenete. Ez a logikus viselkedés.
        
        builder.HasMany(message => message.Attachments)
            .WithOne(attachment => attachment.Message)
            .HasForeignKey(attachment => attachment.MessageId)
            .OnDelete(DeleteBehavior.Cascade); // Ha egy üzenet törlődik, a hozzá tartozó csatolmányok is törlődjenek.
        
        builder.HasMany(message => message.ModerationLogs)
            .WithOne(log => log.Message)
            .HasForeignKey(log => log.MessageId)
            .OnDelete(DeleteBehavior.Cascade); // Ha egy üzenet törlődik, a log bejegyzései is törlődjenek.
    }
}