using Dumcsi.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace Dumcsi.Application.Interfaces
{
    /// <summary>
    /// Defines a service responsible for the complete setup of a new server.
    /// </summary>
    public interface IServerSetupService
    {
        /// <summary>
        /// Creates a new server with all its default components (roles, channels, owner membership).
        /// </summary>
        /// <param name="owner">The user who will own the server.</param>
        /// <param name="name">The name of the new server.</param>
        /// <param name="description">An optional description for the server.</param>
        /// <param name="isPublic">Whether the server is public.</param>
        /// <param name="cancellationToken">A token to cancel the operation.</param>
        /// <returns>The newly created and saved Server entity.</returns>
        Task<Server> CreateNewServerAsync(User owner, string name, string? description, bool isPublic, CancellationToken cancellationToken = default);
    }
}