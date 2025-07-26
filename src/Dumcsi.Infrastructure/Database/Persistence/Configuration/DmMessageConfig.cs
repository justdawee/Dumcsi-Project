using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class DmMessageConfig : IEntityTypeConfiguration<DmMessage>
{
    public void Configure(EntityTypeBuilder<DmMessage> builder)
    {
        builder.HasKey(dm => dm.Id);
        builder.HasOne(dm => dm.Sender)
            .WithMany()
            .HasForeignKey(dm => dm.SenderId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(dm => dm.Receiver)
            .WithMany()
            .HasForeignKey(dm => dm.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}