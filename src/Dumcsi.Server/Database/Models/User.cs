using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

public class User
{
    public long Id { get; set; }
    
    public required string Username { get; set; }
    
    public required string Email { get; set; }
    
    public required byte[] PasswordHash { get; set; }
    
    public string? ProfilePictureUrl { get; set; }

    public required Instant CreatedAt { get; set; }
    
    public ICollection<ChatRoom> CreatedChatRooms { get; set; } = new List<ChatRoom>();
    public ICollection<RoomParticipant> RoomParticipations { get; set; } = new List<RoomParticipant>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    
    public ICollection<ModerationLog> ModerationActions { get; set; } = new List<ModerationLog>();
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Username)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.Property(x => x.Email)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.Property(x => x.PasswordHash)
            .IsRequired();
        
        builder.Property(x => x.ProfilePictureUrl)
            .HasMaxLength(256);
        
        builder.HasIndex(x => x.Username).IsUnique();
        builder.HasIndex(x => x.Email).IsUnique();
    }
}