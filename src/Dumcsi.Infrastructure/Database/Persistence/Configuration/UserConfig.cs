using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

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