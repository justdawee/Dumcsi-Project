using System.Collections.Concurrent;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Dumcsi.Backend.Hubs;
using NodaTime;
using Microsoft.Extensions.DependencyInjection;

namespace Dumcsi.Backend.Services.Data;

public class PresenceService : IPresenceService
{
    private readonly ConcurrentDictionary<string, List<string>> _onlineUsers = new();
    private readonly IDbContextFactory<DumcsiDbContext> _dbContextFactory;
    private readonly IHubContext<ChatHub> _chatHubContext;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public PresenceService(
        IDbContextFactory<DumcsiDbContext> dbContextFactory, 
        IHubContext<ChatHub> chatHubContext,
        IServiceScopeFactory serviceScopeFactory)
    {
        _dbContextFactory = dbContextFactory;
        _chatHubContext = chatHubContext;
        _serviceScopeFactory = serviceScopeFactory;
    }

    public Task<bool> UserConnected(string userId, string connectionId)
    {
        bool isOnline = false;
        _onlineUsers.AddOrUpdate(userId, 
            _ => {
                isOnline = true;
                return new List<string> { connectionId };
            }, 
            (_, connections) => {
                lock (connections)
                {
                    connections.Add(connectionId);
                }
                return connections;
            });
            
        return Task.FromResult(isOnline);
    }

    public Task<bool> UserDisconnected(string userId, string connectionId)
    {
        bool isOffline = false;
        if (_onlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
            }
            
            if (connections.Count == 0)
            {
                isOffline = true;
                _onlineUsers.TryRemove(userId, out _);
            }
        }
        
        return Task.FromResult(isOffline);
    }

    public Task<string[]> GetOnlineUsers()
    {
        return Task.FromResult(_onlineUsers.Keys.ToArray());
    }
    
    public Task<string?> GetUserIdByConnectionId(string connectionId)
    {
        foreach (var kvp in _onlineUsers)
        {
            if (kvp.Value.Contains(connectionId))
            {
                return Task.FromResult<string?>(kvp.Key);
            }
        }

        return Task.FromResult<string?>(null);
    }

    public async Task HandleTemporaryMemberOffline(long userId)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        // Find all temporary memberships for this user
        var temporaryMemberships = await dbContext.ServerMembers
            .Include(sm => sm.Server)
            .Include(sm => sm.User)
            .Include(sm => sm.Roles)
            .Where(sm => sm.UserId == userId && sm.IsTemporary)
            .ToListAsync();

        foreach (var membership in temporaryMemberships)
        {
            // Check if user has roles other than @everyone
            var hasAdditionalRoles = membership.Roles.Any(r => r.Name != "@everyone");
            
            if (!hasAdditionalRoles)
            {
                // User only has @everyone role, kick them from the server
                await KickTemporaryMember(dbContext, membership);
            }
            // If user has additional roles, they keep their membership (no longer temporary)
            else
            {
                // Convert to permanent member since they have additional roles
                membership.IsTemporary = false;
            }
        }

        await dbContext.SaveChangesAsync();
    }

    private async Task KickTemporaryMember(DumcsiDbContext dbContext, Models.Entities.ServerMember membership)
    {
        // Remove the member from the server
        dbContext.ServerMembers.Remove(membership);

        // Log the action using a scoped service
        using var scope = _serviceScopeFactory.CreateScope();
        var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
        
        await auditLogService.LogAsync(
            membership.ServerId,
            0, // System action (user ID 0 represents system)
            AuditLogActionType.ServerMemberLeft,
            membership.UserId,
            AuditLogTargetType.User,
            reason: "Temporary member kicked after going offline"
        );

        // Notify all server members via SignalR
        await _chatHubContext.Clients.Group(membership.ServerId.ToString())
            .SendAsync("UserLeftServer", new { 
                userId = membership.UserId, 
                serverId = membership.ServerId,
                reason = "Temporary membership expired"
            });
    }
}
