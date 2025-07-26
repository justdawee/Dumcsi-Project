using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class FriendRequestConfig : IEntityTypeConfiguration<FriendRequest>
{
    public void Configure(EntityTypeBuilder<FriendRequest> builder)
    {
        builder.HasKey(fr => fr.Id);
        builder.HasOne(fr => fr.FromUser)
            .WithMany()
            .HasForeignKey(fr => fr.FromUserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(fr => fr.ToUser)
            .WithMany()
            .HasForeignKey(fr => fr.ToUserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(fr => new { fr.FromUserId, fr.ToUserId }).IsUnique();
    }
}