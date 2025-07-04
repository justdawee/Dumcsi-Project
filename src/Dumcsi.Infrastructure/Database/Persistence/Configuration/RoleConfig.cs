using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.Color)
            .IsRequired()
            .HasMaxLength(7); // #RRGGBB

        // A szerver és a szerepkörök közötti egy-a-többhöz kapcsolat
        builder.HasOne(r => r.Server)
            .WithMany(s => s.Roles)
            .HasForeignKey(r => r.ServerId)
            .OnDelete(DeleteBehavior.Cascade); // Ha a szerver törlődik, a szerepkörök is

        // A Role és a ServerMember közötti több-a-többhöz kapcsolat beállítása
        builder.HasMany(r => r.Members)
            .WithMany(m => m.Roles);
    }
}