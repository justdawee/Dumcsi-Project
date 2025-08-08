using Microsoft.EntityFrameworkCore;
using Dumcsi.Backend.Services.Data;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.Enums;

namespace Dumcsi.Backend.Services.Data
{
    public class PermissionService(IDbContextFactory<DumcsiDbContext> dbContextFactory) : IPermissionService
    {
        public async Task<bool> HasPermissionForServerAsync(long userId, long serverId, Permission requiredPermission)
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync();

            var member = await dbContext.ServerMembers
                .AsNoTracking()
                .Include(m => m.Roles)
                .Include(m => m.Server)
                .FirstOrDefaultAsync(m => m.UserId == userId && m.ServerId == serverId);

            if (member == null) return false;
            
            if (member.Server.OwnerId == userId) return true;

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
                .Include(m => m.Server)
                .FirstOrDefaultAsync();

            if (member == null) return (false, false);
            
            if (member.Server.OwnerId == userId) return (true, true);

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
                .Include(m => m.Server)
                .FirstOrDefaultAsync();

            if (member == null)
            {
                return (false, Permission.None);
            }
            
            if (member.Server.OwnerId == userId)
            {
                return (true, (Permission)long.MaxValue);
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
