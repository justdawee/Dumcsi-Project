using Dumcsi.Backend.Models.Enums;

namespace Dumcsi.Backend.Services.Data
{
    /// <summary>
    /// Defines a service for checking user permissions within servers and channels.
    /// </summary>
    public interface IPermissionService
    {
        /// <summary>
        /// Checks if a user has a specific permission on a server.
        /// </summary>
        /// <param name="userId">The ID of the user to check.</param>
        /// <param name="serverId">The ID of the server.</param>
        /// <param name="requiredPermission">The permission to check for.</param>
        /// <returns>True if the user has the required permission, otherwise false.</returns>
        Task<bool> HasPermissionForServerAsync(long userId, long serverId, Permission requiredPermission);

        /// <summary>
        /// Checks if a user is a member of a channel's server and has a specific permission.
        /// </summary>
        /// <param name="userId">The ID of the user to check.</param>
        /// <param name="channelId">The ID of the channel.</param>
        /// <param name="requiredPermission">The permission to check for.</param>
        /// <returns>A tuple indicating membership status and permission status.</returns>
        Task<(bool IsMember, bool HasPermission)> CheckPermissionsForChannelAsync(long userId, long channelId, Permission requiredPermission);

        /// <summary>
        /// Gets the aggregated permissions for a user within a specific channel.
        /// </summary>
        /// <param name="userId">The ID of the user.</param>
        /// <param name="channelId">The ID of the channel.</param>
        /// <returns>A tuple indicating membership status and the user's aggregated permissions.</returns>
        Task<(bool IsMember, Permission Permissions)> GetPermissionsForChannelAsync(long userId, long channelId);
    }
}
