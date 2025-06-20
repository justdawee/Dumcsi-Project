using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class ChatRoomConfiguration : IEntityTypeConfiguration<ChatRoom>
{
    public void Configure(EntityTypeBuilder<ChatRoom> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(100); // Szoba neve maximum 100 karakter lehet
        
        builder.Property(x => x.Description)
            .HasMaxLength(5000);
        
        builder.Property(x => x.IconUrl)
            .HasMaxLength(256); // URL méretkorlát
        
        builder.HasOne(x => x.Creator)
            .WithMany(x => x.CreatedChatRooms)
            .HasForeignKey(x => x.CreatorId); // A szoba létrehozójának törlése nem törli a szobát, de a szoba létrehozója nem lehet null, így a törlés előtt a szobát át kell adni másik felhasználónak.
    }
}