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
}