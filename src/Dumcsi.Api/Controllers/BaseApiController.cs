using System.Security.Claims;
using Dumcsi.Api.Common;
using Dumcsi.Domain.Enums;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Api.Controllers;

[ApiController]
public abstract class BaseApiController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    protected readonly IDbContextFactory<DumcsiDbContext> DbContextFactory = dbContextFactory;

    // Egyszerűsített property a felhasználó ID-jának eléréséhez
    protected long CurrentUserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Szabványosított válaszok
    protected IActionResult OkResponse<T>(T data, string? message = null) => Ok(ApiResponse<T>.Success(data, message));
    protected IActionResult OkResponse(string? message = null) => Ok(ApiResponse.Success(message));
    protected IActionResult NotFoundResponse(string message = "Resource not found.") => NotFound(ApiResponse.Fail(message));
    protected IActionResult ForbidResponse(string message = "You don't have permission to perform this action.") => StatusCode(403, ApiResponse.Fail(message));
    protected IActionResult BadRequestResponse(string message) => BadRequest(ApiResponse.Fail(message));

    /// <summary>
    /// Ellenőrzi a felhasználó jogosultságát egy adott szerveren.
    /// Visszaadja a jogosultság meglétét és a tag objektumot, ha létezik.
    /// </summary>
    protected async Task<(bool HasPermission, Domain.Entities.ServerMember? Member)> CheckPermissionAsync(long serverId, Permission requiredPermission, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var member = await dbContext.ServerMembers
            .AsNoTracking()
            .Include(m => m.Roles)
            .FirstOrDefaultAsync(m => m.UserId == CurrentUserId && m.ServerId == serverId, cancellationToken);

        if (member == null) return (false, null);

        var permissions = member.Roles.Aggregate(Permission.None, (current, role) => current | role.Permissions);

        if (permissions.HasFlag(Permission.Administrator) || permissions.HasFlag(requiredPermission))
        {
            return (true, member);
        }

        return (false, member);
    }
}