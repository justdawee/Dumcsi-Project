using Dumcsi.Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Backend.Data.Configurations;

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
