using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

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