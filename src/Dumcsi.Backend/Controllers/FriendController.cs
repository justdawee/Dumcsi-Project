using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Dumcsi.Backend.Services.Data;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/friends")]
public class FriendController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IPresenceService presenceService)
    : BaseApiController(dbContextFactory)
{
    [HttpGet]
    public async Task<IActionResult> GetFriends(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var friends = await dbContext.Friendships
            .Where(f => f.User1Id == CurrentUserId || f.User2Id == CurrentUserId)
            .Select(f => f.User1Id == CurrentUserId ? f.User2 : f.User1)
            .Select(u => new FriendDtos.FriendListItemDto
            {
                UserId = u.Id,
                Username = u.Username,
                Online = false
            })
            .ToListAsync(cancellationToken);

        var onlineUsers = await presenceService.GetOnlineUsers();
        foreach (var friend in friends)
        {
            friend.Online = onlineUsers.Contains(friend.UserId.ToString());
        }

        return OkResponse(friends);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetFriendRequests(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);

        var requests = await dbContext.FriendRequests
            .Where(fr => fr.ToUserId == CurrentUserId && fr.Status == FriendRequestStatus.Pending)
            .Select(fr => new FriendDtos.FriendRequestDto
            {
                RequestId = fr.Id,
                FromUserId = fr.FromUserId,
                FromUsername = fr.FromUser.Username
            })
            .ToListAsync(cancellationToken);

        return OkResponse(requests);
    }

    [HttpPost("request")]
    public async Task<IActionResult> SendFriendRequest([FromBody] FriendDtos.SendFriendRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse.Fail("FRIEND_INVALID", "Invalid request"));
        }

        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var target = await dbContext.Users.FirstOrDefaultAsync(u => u.Username == request.Username, cancellationToken);
        if (target == null)
        {
            return NotFound(ApiResponse.Fail("FRIEND_USER_NOT_FOUND", "User not found"));
        }
        if (target.Id == CurrentUserId)
        {
            return BadRequest(ApiResponse.Fail("FRIEND_SELF", "Cannot add yourself"));
        }
        if (await dbContext.Friendships.AnyAsync(f =>
                (f.User1Id == CurrentUserId && f.User2Id == target.Id) ||
                (f.User2Id == CurrentUserId && f.User1Id == target.Id), cancellationToken))
        {
            return ConflictResponse("FRIEND_ALREADY", "Already friends");
        }
        if (await dbContext.FriendRequests.AnyAsync(fr => fr.FromUserId == CurrentUserId && fr.ToUserId == target.Id && fr.Status == FriendRequestStatus.Pending, cancellationToken))
        {
            return ConflictResponse("FRIEND_REQUEST_EXISTS", "Friend request already sent");
        }

        var fr = new FriendRequest
        {
            FromUserId = CurrentUserId,
            ToUserId = target.Id,
            FromUser = (await dbContext.Users.FindAsync(CurrentUserId))!,
            ToUser = target,
            CreatedAt = NodaTime.SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.FriendRequests.Add(fr);
        await dbContext.SaveChangesAsync(cancellationToken);

        return OkResponse("Friend request sent");
    }

    [HttpPost("request/{id}/accept")]
    public async Task<IActionResult> AcceptRequest(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var request = await dbContext.FriendRequests.FirstOrDefaultAsync(fr => fr.Id == id && fr.ToUserId == CurrentUserId, cancellationToken);
        if (request == null)
        {
            return NotFound(ApiResponse.Fail("FRIEND_REQUEST_NOT_FOUND", "Friend request not found"));
        }

        request.Status = FriendRequestStatus.Accepted;
        request.RespondedAt = NodaTime.SystemClock.Instance.GetCurrentInstant();
        dbContext.Friendships.Add(new Friendship
        {
            User1Id = request.FromUserId,
            User2Id = request.ToUserId,
            User1 = request.FromUser,
            User2 = request.ToUser,
            CreatedAt = request.RespondedAt.Value
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("Friend request accepted");
    }

    [HttpPost("request/{id}/decline")]
    public async Task<IActionResult> DeclineRequest(long id, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var request = await dbContext.FriendRequests.FirstOrDefaultAsync(fr => fr.Id == id && fr.ToUserId == CurrentUserId, cancellationToken);
        if (request == null)
        {
            return NotFound(ApiResponse.Fail("FRIEND_REQUEST_NOT_FOUND", "Friend request not found"));
        }
        request.Status = FriendRequestStatus.Declined;
        request.RespondedAt = NodaTime.SystemClock.Instance.GetCurrentInstant();
        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("Friend request declined");
    }

    [HttpDelete("{friendId}")]
    public async Task<IActionResult> RemoveFriend(long friendId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var friendship = await dbContext.Friendships.FirstOrDefaultAsync(f =>
            (f.User1Id == CurrentUserId && f.User2Id == friendId) ||
            (f.User2Id == CurrentUserId && f.User1Id == friendId), cancellationToken);
        if (friendship == null)
        {
            return NotFound(ApiResponse.Fail("FRIEND_NOT_FOUND", "Friendship not found"));
        }
        dbContext.Friendships.Remove(friendship);
        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("Friend removed");
    }
}
