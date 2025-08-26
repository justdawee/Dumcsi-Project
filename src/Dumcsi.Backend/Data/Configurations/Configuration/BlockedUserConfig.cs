using Dumcsi.Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Backend.Data.Configurations;

public class BlockedUserConfig : IEntityTypeConfiguration<BlockedUser>
{
    public void Configure(EntityTypeBuilder<BlockedUser> builder)
    {
        builder.HasKey(b => b.Id);
        builder.HasOne(b => b.Blocker)
            .WithMany()
            .HasForeignKey(b => b.BlockerId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.Blocked)
            .WithMany()
            .HasForeignKey(b => b.BlockedId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(b => new { b.BlockerId, b.BlockedId }).IsUnique();
    }
}

