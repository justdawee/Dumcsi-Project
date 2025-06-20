using Dumcsi.Server.Database.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

public class RoomParticipant
{
    public long UserId { get; set; }
    
    public required User User { get; set; }

    public long RoomId { get; set; }
    
    public required ChatRoom ChatRoom { get; set; }

    public Role Role { get; set; } = Role.Member;
    
    public Instant JoinedAt { get; set; }

    // A felhasználó némítja le a szobát
    public bool IsMutedForUser { get; set; } = false;

    // A moderátor némítja le a felhasználót
    public bool IsSilencedByModerator { get; set; } = false;
    
    public Instant? SilencedUntil { get; set; }
}

public class RoomParticipantConfiguration : IEntityTypeConfiguration<RoomParticipant>
{
    public void Configure(EntityTypeBuilder<RoomParticipant> builder)
    {
        builder.HasKey(x => new { x.UserId, x.RoomId });

        builder.Property(x => x.Role)
            .IsRequired();

        builder.Property(x => x.JoinedAt)
            .IsRequired();
        
        builder.HasOne(x => x.User)
            .WithMany(x => x.RoomParticipations)
            .HasForeignKey(x => x.UserId);

        builder.HasOne(x => x.ChatRoom)
            .WithMany(x => x.Participants)
            .HasForeignKey(x => x.RoomId);
    }
}