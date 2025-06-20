using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net.Mail;
using Dumcsi.Server.Database.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

public class Message
{
    public long Id { get; set; }

    public long RoomId { get; set; }
    
    public required ChatRoom ChatRoom { get; set; }

    public long SenderId { get; set; }
    
    public required User Sender { get; set; }
    
    public required string Content { get; set; }

    public ModerationStatus ModerationStatus { get; set; } = ModerationStatus.Visible;
    
    public Instant CreatedAt { get; set; }
    
    public Instant UpdatedAt { get; set; }
    
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    
    public ICollection<ModerationLog> ModerationLogs { get; set; } = new List<ModerationLog>();
}

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
               .OnDelete(DeleteBehavior.Restrict); // FONTOS: Ha egy usert törölnének, ne törlődjenek az üzenetei. Ez megakadályozza a törlést, amíg vannak üzenetei.
        
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