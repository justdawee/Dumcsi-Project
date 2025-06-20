using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

public class ChatRoom
{
    public long Id { get; set; }
    
    public required string Name { get; set; }

    public string? Description { get; set; }
    
    public string? IconUrl { get; set; }

    public long CreatorId { get; set; }
    
    public required User Creator { get; set; }

    public Instant CreatedAt { get; set; }
    
    public Instant UpdatedAt { get; set; }
    
    public ICollection<RoomParticipant> Participants { get; set; } = new List<RoomParticipant>();
    
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

public class ChatRoomConfiguration : IEntityTypeConfiguration<ChatRoom>
{
    public void Configure(EntityTypeBuilder<ChatRoom> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.Property(x => x.Description)
            .HasMaxLength(5000);
        
        builder.Property(x => x.IconUrl)
            .HasMaxLength(256); // URL length limit
        
        builder.HasOne(x => x.Creator)
            .WithMany(x => x.CreatedChatRooms)
            .HasForeignKey(x => x.CreatorId);
    }
}