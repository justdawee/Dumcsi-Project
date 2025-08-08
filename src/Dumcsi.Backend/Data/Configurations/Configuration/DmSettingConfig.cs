using Dumcsi.Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Backend.Data.Configurations;

public class DmSettingConfig : IEntityTypeConfiguration<DmSetting>
{
    public void Configure(EntityTypeBuilder<DmSetting> builder)
    {
        builder.HasKey(ds => ds.UserId);
        builder.Property(ds => ds.FilterOption).HasConversion<int>();
        builder.HasOne(ds => ds.User)
            .WithMany()
            .HasForeignKey(ds => ds.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
