using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Dumcsi.Server.Database.Models;

public class UserRefreshToken
{
    public long Id { get; set; }
    
    public long UserId { get; set; }
    
    public string? Token { get; set; }
    
    public required Instant ExpiresAt { get; set; }
    
    public required User User { get; set; }
    
    public required Instant CreatedAt { get; set; }
}

public class UserRefreshTokenConfiguration : IEntityTypeConfiguration<UserRefreshToken>
{
    public void Configure(EntityTypeBuilder<UserRefreshToken> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Token)
            .HasMaxLength(500);
        
        builder.Property(x => x.ExpiresAt)
            .IsRequired();
        
        builder.Property(x => x.CreatedAt)
            .IsRequired();
        
        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade); // Cascade delete to remove tokens when user is deleted
    }
}