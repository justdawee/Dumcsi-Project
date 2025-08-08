using System.Security.Claims;
using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumcsi.Backend.Controllers;

[ApiController]
public abstract class BaseApiController(IDbContextFactory<DumcsiDbContext> dbContextFactory) : ControllerBase
{
    protected readonly IDbContextFactory<DumcsiDbContext> DbContextFactory = dbContextFactory;
    
    protected long CurrentUserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected IActionResult OkResponse<T>(T data, string? message = null) => Ok(ApiResponse<T>.Success(data, message));
    protected IActionResult OkResponse(string? message = null) => Ok(ApiResponse.Success(message));
    protected IActionResult NotFoundResponse(string message = "Resource not found.") => NotFound(ApiResponse.Fail("RESOURCE_NOT_FOUND", message));
    protected IActionResult ForbidResponse(string message = "You don't have permission for this action.") => StatusCode(403, ApiResponse.Fail("FORBIDDEN", message));
    protected IActionResult BadRequestResponse(string message) => BadRequest(ApiResponse.Fail("INVALID_REQUEST", message));
    protected IActionResult ConflictResponse(string code, string message) => Conflict(ApiResponse.Fail(code, message));
}
