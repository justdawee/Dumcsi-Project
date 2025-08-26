using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/dm")]
public class DmController(IDbContextFactory<DumcsiDbContext> dbContextFactory)
    : BaseApiController(dbContextFactory)
{
    [HttpGet("settings")] 
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var setting = await dbContext.DmSettings.FindAsync([CurrentUserId], cancellationToken);
        var filter = setting?.FilterOption ?? DmFilterOption.AllowAll;
        return OkResponse(new { Filter = filter });
    }

    [HttpPut("settings")] 
    public async Task<IActionResult> UpdateSettings([FromBody] DmSettingsDto request,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var setting = await dbContext.DmSettings.FindAsync([CurrentUserId], cancellationToken);
        if (setting == null)
        {
            setting = new DmSetting
            {
                UserId = CurrentUserId,
                User = (await dbContext.Users.FindAsync(CurrentUserId))!,
                FilterOption = request.Filter
            };
            dbContext.DmSettings.Add(setting);
        }
        else
        {
            setting.FilterOption = request.Filter;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("Settings updated");
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var reqs = await dbContext.DmRequests
            .Where(r => r.ToUserId == CurrentUserId && r.Status == DmRequestStatus.Pending)
            .Select(r => new { r.Id, r.FromUserId, r.FromUser.Username, r.InitialMessage })
            .ToListAsync(cancellationToken);
        return OkResponse(reqs);
    }

    [HttpPost("requests/{id}/accept")]
    public async Task<IActionResult> AcceptDmRequest(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var req = await dbContext.DmRequests.FirstOrDefaultAsync(r => r.Id == id && r.ToUserId == CurrentUserId, cancellationToken);
        if (req == null)
        {
            return NotFound(ApiResponse.Fail("DM_REQUEST_NOT_FOUND", "Request not found"));
        }
        req.Status = DmRequestStatus.Accepted;
        req.RespondedAt = SystemClock.Instance.GetCurrentInstant();
        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("DM request accepted");
    }

    [HttpPost("requests/{id}/decline")]
    public async Task<IActionResult> DeclineDmRequest(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var req = await dbContext.DmRequests.FirstOrDefaultAsync(r => r.Id == id && r.ToUserId == CurrentUserId, cancellationToken);
        if (req == null)
        {
            return NotFound(ApiResponse.Fail("DM_REQUEST_NOT_FOUND", "Request not found"));
        }
        req.Status = DmRequestStatus.Declined;
        req.RespondedAt = SystemClock.Instance.GetCurrentInstant();
        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("DM request declined");
    }

    public class DmSettingsDto
    {
        public DmFilterOption Filter { get; set; }
    }
}
