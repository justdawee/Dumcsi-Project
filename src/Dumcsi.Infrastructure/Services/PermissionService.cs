using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.EntityFrameworkCore;
using Dumcsi.Domain.Interfaces;

namespace Dumcsi.Infrastructure.Services
{
    public class PermissionService(IDbContextFactory<DumcsiDbContext> dbContextFactory) : IPermissionService
    {
        public async Task<bool> HasPermissionForServerAsync(long userId, long serverId, Permission requiredPermission)
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync();

            var member = await dbContext.ServerMembers
                .AsNoTracking()
                .Include(m => m.Roles)
                .FirstOrDefaultAsync(m => m.UserId == userId && m.ServerId == serverId);

            if (member == null) return false;

            var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

            if (permissions.HasFlag(Permission.Administrator)) return true;

            return permissions.HasFlag(requiredPermission);
        }

        public async Task<(bool IsMember, bool HasPermission)> CheckPermissionsForChannelAsync(long userId, long channelId, Permission requiredPermission)
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync();

            var member = await dbContext.ServerMembers
                .AsNoTracking()
                .Where(m => m.UserId == userId && m.Server.Channels.Any(c => c.Id == channelId))
                .Include(m => m.Roles)
                .FirstOrDefaultAsync();

            if (member == null) return (false, false);

            var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

            if (permissions.HasFlag(Permission.Administrator)) return (true, true);

            return (true, permissions.HasFlag(requiredPermission));
        }

        public async Task<(bool IsMember, Permission Permissions)> GetPermissionsForChannelAsync(long userId, long channelId)
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync();

            var member = await dbContext.ServerMembers
                .AsNoTracking()
                .Where(m => m.UserId == userId && m.Server.Channels.Any(c => c.Id == channelId))
                .Include(m => m.Roles)
                .FirstOrDefaultAsync();

            if (member == null)
            {
                return (false, Permission.None);
            }

            var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

            if (permissions.HasFlag(Permission.Administrator))
            {
                return (true, (Permission)long.MaxValue); // Grant all permissions for Administrator
            }

            return (true, permissions);
        }
    }
}
