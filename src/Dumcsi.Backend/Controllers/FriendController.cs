using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dumcsi.Backend.Common;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;
using Dumcsi.Backend.Services.Data;
using Microsoft.AspNetCore.SignalR;
using NodaTime;

namespace Dumcsi.Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/friends")]
public class FriendController(
    IDbContextFactory<DumcsiDbContext> dbContextFactory,
    IPresenceService presenceService,
    IHubContext<Hubs.ChatHub> hubContext)
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

        // Block checks
        if (await dbContext.BlockedUsers.AnyAsync(b => b.BlockerId == CurrentUserId && b.BlockedId == target.Id, cancellationToken))
        {
            return ConflictResponse("FRIEND_BLOCKED_BY_YOU", "You have blocked this user");
        }
        if (await dbContext.BlockedUsers.AnyAsync(b => b.BlockerId == target.Id && b.BlockedId == CurrentUserId, cancellationToken))
        {
            return ConflictResponse("FRIEND_BLOCKED_BY_OTHER", "This user has blocked you");
        }

        // If the target has already sent us a pending request, do not auto-accept
        var reversePending = await dbContext.FriendRequests
            .FirstOrDefaultAsync(fr => fr.FromUserId == target.Id && fr.ToUserId == CurrentUserId && fr.Status == FriendRequestStatus.Pending, cancellationToken);
        if (reversePending != null)
        {
            return ConflictResponse("FRIEND_REQUEST_PENDING_RESPONSE", "This user has already sent you a request. Please accept or decline it.");
        }

        // If there exists a previous declined/accepted request in the same direction, reuse it by setting back to Pending
        var existingAny = await dbContext.FriendRequests
            .FirstOrDefaultAsync(fr => fr.FromUserId == CurrentUserId && fr.ToUserId == target.Id, cancellationToken);
        if (existingAny != null)
        {
            if (existingAny.Status == FriendRequestStatus.Accepted)
            {
                var stillFriends = await dbContext.Friendships.AnyAsync(f =>
                    (f.User1Id == CurrentUserId && f.User2Id == target.Id) ||
                    (f.User2Id == CurrentUserId && f.User1Id == target.Id), cancellationToken);
                if (stillFriends)
                {
                    return ConflictResponse("FRIEND_ALREADY", "Already friends");
                }

                // Reopen to pending if no current friendship
                existingAny.Status = FriendRequestStatus.Pending;
                existingAny.CreatedAt = SystemClock.Instance.GetCurrentInstant();
                existingAny.RespondedAt = null;
                await dbContext.SaveChangesAsync(cancellationToken);

                var fromUserName2 = await dbContext.Users
                    .Where(u => u.Id == existingAny.FromUserId)
                    .Select(u => u.Username)
                    .FirstOrDefaultAsync(cancellationToken) ?? "";

                await hubContext.Clients.User(target.Id.ToString()).SendAsync(
                    "FriendRequestReceived",
                    new FriendDtos.FriendRequestDto
                    {
                        RequestId = existingAny.Id,
                        FromUserId = existingAny.FromUserId,
                        FromUsername = fromUserName2
                    },
                    cancellationToken);

                await hubContext.Clients.User(CurrentUserId.ToString()).SendAsync(
                    "FriendRequestSent",
                    new { ToUserId = target.Id, ToUsername = target.Username },
                    cancellationToken);

                return OkResponse("Friend request re-sent");
            }

            // Reopen declined/other request
            existingAny.Status = FriendRequestStatus.Pending;
            existingAny.CreatedAt = SystemClock.Instance.GetCurrentInstant();
            existingAny.RespondedAt = null;
            await dbContext.SaveChangesAsync(cancellationToken);

            // Load the sender username safely (avoid null navs)
            var fromUserName = await dbContext.Users
                .Where(u => u.Id == existingAny.FromUserId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync(cancellationToken) ?? "";

            await hubContext.Clients.User(target.Id.ToString()).SendAsync(
                "FriendRequestReceived",
                new FriendDtos.FriendRequestDto
                {
                    RequestId = existingAny.Id,
                    FromUserId = existingAny.FromUserId,
                    FromUsername = fromUserName
                },
                cancellationToken);

            await hubContext.Clients.User(CurrentUserId.ToString()).SendAsync(
                "FriendRequestSent",
                new { ToUserId = target.Id, ToUsername = target.Username },
                cancellationToken);

            return OkResponse("Friend request re-sent");
        }

        var currentUser = await dbContext.Users.FindAsync(new object?[] { CurrentUserId }, cancellationToken);
        if (currentUser == null)
        {
            return BadRequest(ApiResponse.Fail("USER_NOT_FOUND", "Current user not found"));
        }

        var fr = new FriendRequest
        {
            FromUserId = CurrentUserId,
            ToUserId = target.Id,
            FromUser = currentUser,
            ToUser = target,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        };

        dbContext.FriendRequests.Add(fr);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Realtime notify target user of new request
        var newFromUserName = await dbContext.Users
            .Where(u => u.Id == fr.FromUserId)
            .Select(u => u.Username)
            .FirstOrDefaultAsync(cancellationToken) ?? "";
        await hubContext.Clients.User(target.Id.ToString()).SendAsync(
            "FriendRequestReceived",
            new FriendDtos.FriendRequestDto
            {
                RequestId = fr.Id,
                FromUserId = fr.FromUserId,
                FromUsername = newFromUserName
            },
            cancellationToken);

        // Optional: notify sender success
        await hubContext.Clients.User(CurrentUserId.ToString()).SendAsync(
            "FriendRequestSent",
            new { ToUserId = target.Id, ToUsername = target.Username },
            cancellationToken);

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
        request.RespondedAt = SystemClock.Instance.GetCurrentInstant();
        var fromUser = await dbContext.Users.FindAsync(new object?[] { request.FromUserId }, cancellationToken);
        var toUser = await dbContext.Users.FindAsync(new object?[] { request.ToUserId }, cancellationToken);
        if (fromUser == null || toUser == null)
        {
            return BadRequest(ApiResponse.Fail("USER_NOT_FOUND", "Users not found"));
        }

        dbContext.Friendships.Add(new Friendship
        {
            User1Id = request.FromUserId,
            User2Id = request.ToUserId,
            User1 = fromUser,
            User2 = toUser,
            CreatedAt = request.RespondedAt.Value
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        // Realtime notify both users of accepted friendship
        var fromUserInfo = await dbContext.Users
            .Where(u => u.Id == request.FromUserId)
            .Select(u => new { u.Id, u.Username })
            .FirstOrDefaultAsync(cancellationToken);
        var toUserInfo = await dbContext.Users
            .Where(u => u.Id == request.ToUserId)
            .Select(u => new { u.Id, u.Username })
            .FirstOrDefaultAsync(cancellationToken);

        // For requester (fromUser) -> send accepter (toUser)
        var friendForRequester = new FriendDtos.FriendListItemDto
        {
            UserId = toUserInfo!.Id,
            Username = toUserInfo.Username,
            Online = false
        };
        // For accepter (toUser) -> send requester (fromUser)
        var friendForAccepter = new FriendDtos.FriendListItemDto
        {
            UserId = fromUserInfo!.Id,
            Username = fromUserInfo.Username,
            Online = false
        };

        await hubContext.Clients.User(fromUserInfo.Id.ToString())
            .SendAsync("FriendRequestAccepted", friendForRequester, cancellationToken);
        await hubContext.Clients.User(toUserInfo.Id.ToString())
            .SendAsync("FriendAdded", friendForAccepter, cancellationToken);

        // Ensure DM request is marked accepted to allow immediate messaging
        var dmReq = await dbContext.DmRequests.FirstOrDefaultAsync(r =>
            (r.FromUserId == request.FromUserId && r.ToUserId == request.ToUserId) ||
            (r.FromUserId == request.ToUserId && r.ToUserId == request.FromUserId), cancellationToken);
        if (dmReq == null)
        {
            var dmFromUser = await dbContext.Users.FindAsync(new object?[] { request.FromUserId }, cancellationToken);
            var dmToUser = await dbContext.Users.FindAsync(new object?[] { request.ToUserId }, cancellationToken);
            if (dmFromUser == null || dmToUser == null)
            {
                return BadRequest(ApiResponse.Fail("USER_NOT_FOUND", "Users not found for DM request"));
            }

            dbContext.DmRequests.Add(new DmRequest
            {
                FromUserId = request.FromUserId,
                ToUserId = request.ToUserId,
                FromUser = dmFromUser,
                ToUser = dmToUser,
                Status = DmRequestStatus.Accepted,
                CreatedAt = SystemClock.Instance.GetCurrentInstant(),
                RespondedAt = SystemClock.Instance.GetCurrentInstant()
            });
        }
        else
        {
            dmReq.Status = DmRequestStatus.Accepted;
            dmReq.RespondedAt = SystemClock.Instance.GetCurrentInstant();
        }
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
        request.RespondedAt = SystemClock.Instance.GetCurrentInstant();
        await dbContext.SaveChangesAsync(cancellationToken);

        // Realtime notify requester of decline
        await hubContext.Clients.User(request.FromUserId.ToString()).SendAsync(
            "FriendRequestDeclined",
            new { RequestId = request.Id, request.ToUserId },
            cancellationToken);

        return OkResponse("Friend request declined");
    }

    [HttpDelete("{friendId}")]
    public async Task<IActionResult> RemoveFriend(long friendId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var friendship = await dbContext.Friendships.FirstOrDefaultAsync(f =>
            (f.User1Id == CurrentUserId && f.User2Id == friendId) ||
            (f.User2Id == CurrentUserId && f.User1Id == friendId), cancellationToken);
        if (friendship != null)
        {
            dbContext.Friendships.Remove(friendship);
            await dbContext.SaveChangesAsync(cancellationToken);

            // Realtime notify the other user of removal
            var otherId = friendship.User1Id == CurrentUserId ? friendship.User2Id : friendship.User1Id;
            await hubContext.Clients.User(otherId.ToString()).SendAsync(
                "FriendRemoved",
                new { UserId = CurrentUserId },
                cancellationToken);
        }

        // Also mark any DM requests between users as declined so messaging is blocked post-unfriend
        var dmReqs = await dbContext.DmRequests
            .Where(r => (r.FromUserId == CurrentUserId && r.ToUserId == friendId) ||
                        (r.FromUserId == friendId && r.ToUserId == CurrentUserId))
            .ToListAsync(cancellationToken);
        foreach (var r in dmReqs)
        {
            r.Status = DmRequestStatus.Declined;
            r.RespondedAt = SystemClock.Instance.GetCurrentInstant();
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        // Idempotent: treat non-existent friendship as already removed
        return OkResponse("Friend removed");
    }

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedUsers(CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var list = await dbContext.BlockedUsers
            .Where(b => b.BlockerId == CurrentUserId)
            .Select(b => new FriendDtos.FriendListItemDto
            {
                UserId = b.BlockedId,
                Username = b.Blocked.Username,
                Online = false
            })
            .ToListAsync(cancellationToken);
        return OkResponse(list);
    }

    [HttpPost("block/{userId}")]
    public async Task<IActionResult> BlockUser(long userId, CancellationToken cancellationToken)
    {
        if (userId == CurrentUserId) return BadRequest(ApiResponse.Fail("BLOCK_SELF", "Cannot block yourself"));
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var user = await dbContext.Users.FindAsync(new object?[] { userId }, cancellationToken);
        if (user == null) return NotFound(ApiResponse.Fail("USER_NOT_FOUND", "User not found"));

        // If already blocked, no-op
        if (await dbContext.BlockedUsers.AnyAsync(b => b.BlockerId == CurrentUserId && b.BlockedId == userId, cancellationToken))
        {
            return OkResponse("Already blocked");
        }

        // Remove friendship if exists
        var friendship = await dbContext.Friendships.FirstOrDefaultAsync(f =>
            (f.User1Id == CurrentUserId && f.User2Id == userId) ||
            (f.User2Id == CurrentUserId && f.User1Id == userId), cancellationToken);
        if (friendship != null)
        {
            dbContext.Friendships.Remove(friendship);
        }

        // Decline any pending requests in either direction
        var requests = await dbContext.FriendRequests
            .Where(fr => (fr.FromUserId == CurrentUserId && fr.ToUserId == userId) || (fr.FromUserId == userId && fr.ToUserId == CurrentUserId))
            .ToListAsync(cancellationToken);
        foreach (var r in requests)
        {
            if (r.Status == FriendRequestStatus.Pending)
            {
                r.Status = FriendRequestStatus.Declined;
                r.RespondedAt = SystemClock.Instance.GetCurrentInstant();
            }
        }

        // Also decline any existing DM requests in either direction to prevent bypassing DM settings after block
        var dmRequests = await dbContext.DmRequests
            .Where(r => (r.FromUserId == CurrentUserId && r.ToUserId == userId) ||
                        (r.FromUserId == userId && r.ToUserId == CurrentUserId))
            .ToListAsync(cancellationToken);
        foreach (var dr in dmRequests)
        {
            if (dr.Status != DmRequestStatus.Declined)
            {
                dr.Status = DmRequestStatus.Declined;
                dr.RespondedAt = SystemClock.Instance.GetCurrentInstant();
            }
        }

        var blocker = await dbContext.Users.FindAsync(new object?[] { CurrentUserId }, cancellationToken);
        if (blocker == null)
        {
            return BadRequest(ApiResponse.Fail("USER_NOT_FOUND", "Current user not found"));
        }

        dbContext.BlockedUsers.Add(new BlockedUser
        {
            BlockerId = CurrentUserId,
            BlockedId = userId,
            Blocker = blocker,
            Blocked = user,
            CreatedAt = SystemClock.Instance.GetCurrentInstant()
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("User blocked");
    }

    [HttpPost("unblock/{userId}")]
    public async Task<IActionResult> UnblockUser(long userId, CancellationToken cancellationToken)
    {
        await using var dbContext = await DbContextFactory.CreateDbContextAsync(cancellationToken);
        var entry = await dbContext.BlockedUsers.FirstOrDefaultAsync(b => b.BlockerId == CurrentUserId && b.BlockedId == userId, cancellationToken);
        if (entry == null) return NotFound(ApiResponse.Fail("BLOCK_NOT_FOUND", "Not blocked"));
        dbContext.BlockedUsers.Remove(entry);
        await dbContext.SaveChangesAsync(cancellationToken);
        return OkResponse("User unblocked");
    }
}
