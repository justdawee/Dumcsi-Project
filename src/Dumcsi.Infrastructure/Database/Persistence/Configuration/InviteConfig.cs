using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class InviteConfiguration : IEntityTypeConfiguration<Invite>
{
    public void Configure(EntityTypeBuilder<Invite> builder)
    {
        // Az elsődleges kulcs a 'Code'.
        builder.HasKey(i => i.Code);
        builder.Property(i => i.Code).HasMaxLength(16);

        // Kapcsolat a Server-hez (egy szervernek több meghívója lehet)
        builder.HasOne(i => i.Server)
            .WithMany() // Egy szervernek több meghívója lehet
            .HasForeignKey(i => i.ServerId)
            .OnDelete(DeleteBehavior.Cascade); // Ha a szerver törlődik, a meghívói is.

        // Kapcsolat a Channel-hez (opcionális)
        builder.HasOne(i => i.Channel)
            .WithMany()
            .HasForeignKey(i => i.ChannelId)
            .IsRequired(false) // Nem kötelező csatornát megadni
            .OnDelete(DeleteBehavior.SetNull); // Ha a csatorna törlődik, a meghívóban null lesz az értéke.

        // Kapcsolat a User-hez (létrehozó)
        builder.HasOne(i => i.Creator)
            .WithMany()
            .HasForeignKey(i => i.CreatorId)
            .OnDelete(DeleteBehavior.Restrict); // A felhasználó törlése ne törölje a meghívóit.
    }
}