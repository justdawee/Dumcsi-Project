using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class ServerConfiguration : IEntityTypeConfiguration<Domain.Entities.Server>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Server> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.Property(x => x.Description)
            .HasMaxLength(500);
        
        builder.Property(x => x.IconUrl)
            .HasMaxLength(256);
            
        builder.Property(x => x.InviteCode)
            .HasMaxLength(20);
        
        builder.HasOne(x => x.Owner)
            .WithMany(x => x.OwnedServers)
            .HasForeignKey(x => x.OwnerId)
            .OnDelete(DeleteBehavior.Restrict); // Owner törlése ne törölje a servert
    }
}