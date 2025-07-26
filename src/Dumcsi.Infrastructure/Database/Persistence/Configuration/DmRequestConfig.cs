using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

public class DmRequestConfig : IEntityTypeConfiguration<DmRequest>
{
    public void Configure(EntityTypeBuilder<DmRequest> builder)
    {
        builder.HasKey(dr => dr.Id);
        builder.HasOne(dr => dr.FromUser)
            .WithMany()
            .HasForeignKey(dr => dr.FromUserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(dr => dr.ToUser)
            .WithMany()
            .HasForeignKey(dr => dr.ToUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}