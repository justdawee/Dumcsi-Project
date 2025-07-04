using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class CustomEmojiConfiguration : IEntityTypeConfiguration<CustomEmoji>
{
    public void Configure(EntityTypeBuilder<CustomEmoji> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(50);
        builder.Property(e => e.ImageUrl).IsRequired().HasMaxLength(256);

        // Egy szerveren nem lehet két azonos nevű emoji
        builder.HasIndex(e => new { e.ServerId, e.Name }).IsUnique();

        builder.HasOne(e => e.Server)
            .WithMany() // Egy szervernek több emojija lehet
            .HasForeignKey(e => e.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Creator)
            .WithMany()
            .HasForeignKey(e => e.CreatorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}