using Dumcsi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Infrastructure.Database.Persistence;

public class DumcsiDbContext(DbContextOptions<DumcsiDbContext> options) : DbContext(options)
{
    public static string Path = "DumcsiDb";

    // DB sets for the entities
    public DbSet<User> Users { get; set; }
    public DbSet<Server> Servers { get; set; }
    public DbSet<Channel> Channels { get; set; }
    public DbSet<ServerMember> ServerMembers { get; set; } 
    public DbSet<Message> Messages { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<ModerationLog> ModerationLogs { get; set; }
    public DbSet<Role> Roles { get; set; }
    
    // DB sets for authentication
    public DbSet<UserRefreshToken> UserRefreshTokens { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DumcsiDbContext).Assembly);
    }
}