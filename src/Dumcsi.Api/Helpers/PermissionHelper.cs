using System.Security.Claims;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Helpers;

public static class PermissionHelper
{
    /// <summary>
    /// Ellenőrzi, hogy a bejelentkezett felhasználónak van-e megfelelő jogosultsága egy adott szerveren.
    /// </summary>
    /// <param name="controller">A controller, amiből a metódust hívják.</param>
    /// <param name="dbContextFactory">Adatbázis kontextus gyár.</param>
    /// <param name="serverId">A szerver azonosítója.</param>
    /// <param name="requiredPermission">Az elvárt jogosultság.</param>
    /// <returns>True, ha a felhasználó rendelkezik a jogosultsággal.</returns>
    public static async Task<bool> HasPermissionForServerAsync(
        this ControllerBase controller, 
        IDbContextFactory<DumcsiDbContext> dbContextFactory, 
        long serverId, 
        Permission requiredPermission)
    {
        var userIdClaim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return false;
        }

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

    /// <summary>
    /// Ellenőrzi, hogy a bejelentkezett felhasználónak van-e megfelelő jogosultsága egy adott csatornához (a szerveren keresztül).
    /// </summary>
    /// <param name="controller">A controller, amiből a metódust hívják.</param>
    /// <param name="dbContextFactory">Adatbázis kontextus gyár.</param>
    /// <param name="channelId">A csatorna azonosítója.</param>
    /// <param name="requiredPermission">Az elvárt jogosultság.</param>
    /// <returns>Egy (IsMember, HasPermission) tuple-t ad vissza.</returns>
    public static async Task<(bool IsMember, bool HasPermission)> CheckPermissionsForChannelAsync(
        this ControllerBase controller, 
        IDbContextFactory<DumcsiDbContext> dbContextFactory, 
        long channelId, 
        Permission requiredPermission)
    {
        var userIdClaim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdClaim, out var userId))
        {
            return (false, false);
        }
        
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
}