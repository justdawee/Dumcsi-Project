using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Server.Database;

public class DumcsiDbContext(DbContextOptions<DumcsiDbContext> options) : DbContext(options)
{
    public static string Path = "DumcsiDb";

    public DbSet<User> Users { get; set; }
    public DbSet<Domain.Entities.Server> Servers { get; set; }
    public DbSet<Channel> Channels { get; set; }
    public DbSet<ServerMember> ServerMembers { get; set; } 
    public DbSet<Message> Messages { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<ModerationLog> ModerationLogs { get; set; }
    public DbSet<UserRefreshToken> UserRefreshTokens { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DumcsiDbContext).Assembly);
    }
}