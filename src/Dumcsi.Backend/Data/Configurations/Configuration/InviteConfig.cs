using Dumcsi.Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Backend.Data.Configurations;

public class InviteConfiguration : IEntityTypeConfiguration<Invite>
{
    public void Configure(EntityTypeBuilder<Invite> builder)
    {
        builder.HasKey(i => i.Code);
        builder.Property(i => i.Code).HasMaxLength(16);

        builder.HasOne(i => i.Server)
            .WithMany()
            .HasForeignKey(i => i.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Channel)
            .WithMany()
            .HasForeignKey(i => i.ChannelId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(i => i.Creator)
            .WithMany()
            .HasForeignKey(i => i.CreatorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}