using Dumcsi.Backend.Services.Auth;
using Dumcsi.Backend.Services.Data;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using System.Threading;
using System.Threading.Tasks;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Models.Entities;
using Dumcsi.Backend.Models.Enums;

namespace Dumcsi.Backend.Services.Data
{
    public class ServerSetupService(IDbContextFactory<DumcsiDbContext> dbContextFactory, IAuditLogService auditLogService) : IServerSetupService
    {
        public async Task<Server> CreateNewServerAsync(User owner, string name, string? description, bool isPublic, CancellationToken cancellationToken = default)
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            
            dbContext.Users.Attach(owner);

            var server = new Server
            {
                Name = name,
                Description = description,
                Public = isPublic,
                Owner = owner,
                CreatedAt = SystemClock.Instance.GetCurrentInstant(),
                UpdatedAt = SystemClock.Instance.GetCurrentInstant()
            };

            var everyoneRole = new Role
            {
                Name = "@everyone",
                Server = server,
                Permissions = Permission.ViewChannels | Permission.ReadMessageHistory | Permission.SendMessages | Permission.AddReactions | Permission.Connect | Permission.Speak,
                Position = 0,
                CreatedAt = SystemClock.Instance.GetCurrentInstant()
            };

            var serverMember = new ServerMember
            {
                User = owner,
                Server = server,
                JoinedAt = SystemClock.Instance.GetCurrentInstant()
            };
            
            serverMember.Roles.Add(everyoneRole);
            
            var defaultTopic = new Topic
            {
                Name = "general",
                Server = server,
                CreatedAt = SystemClock.Instance.GetCurrentInstant(),
                UpdatedAt = SystemClock.Instance.GetCurrentInstant()
            };

            var defaultChannel = new Channel
            {
                Name = "general",
                Server = server,
                Topic = defaultTopic,
                CreatedAt = SystemClock.Instance.GetCurrentInstant(),
                UpdatedAt = SystemClock.Instance.GetCurrentInstant()
            };

            dbContext.Servers.Add(server);
            dbContext.Roles.AddRange(everyoneRole);
            dbContext.ServerMembers.Add(serverMember);
            dbContext.Topics.Add(defaultTopic);
            dbContext.Channels.Add(defaultChannel);

            await dbContext.SaveChangesAsync(cancellationToken);
            
            await auditLogService.LogAsync(server.Id, owner.Id, AuditLogActionType.ServerCreated, server.Id, AuditLogTargetType.Server, new { server.Name });

            return server;
        }
    }
}
