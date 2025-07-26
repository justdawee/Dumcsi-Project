using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dumcsi.Infrastructure.Database.Persistence.Configuration;

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