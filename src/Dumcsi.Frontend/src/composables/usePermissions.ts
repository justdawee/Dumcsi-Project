import {computed, type ComputedRef} from 'vue';
import { useAppStore } from '@/stores/app';
import { Permission, type ServerDetails, type EntityId, type Role, type ServerListItem } from '@/services/types';

export interface PermissionCheckResult {
    hasPermission: boolean;
    isOwner: boolean;
    isAdministrator: boolean;
}

let permissionDetailsInstance: Record<number, { name: string; description: string }> | null = null;

export function usePermissions() {
    const appStore = useAppStore();

    const hasPermission = (permission: Permission, serverId?: EntityId): boolean => {
        const server: ServerDetails | ServerListItem | null = serverId
            ? appStore.servers.find(s => s.id === serverId) ?? null
            : appStore.currentServer;

        if (!server) return false;

        if (server.isOwner) return true;

        if (!('currentUserPermissions' in server)) return false;

        const serverDetails = server as ServerDetails;

        if ((serverDetails.currentUserPermissions & Permission.Administrator) !== 0) return true;

        return (serverDetails.currentUserPermissions & permission) !== 0;
    };

    const hasAnyPermission = (permissions: Permission[], serverId?: EntityId): boolean => {
        return permissions.some(permission => hasPermission(permission, serverId));
    };

    const hasAllPermissions = (permissions: Permission[], serverId?: EntityId): boolean => {
        return permissions.every(permission => hasPermission(permission, serverId));
    };

    const can = (permission: Permission, serverId?: EntityId): ComputedRef<boolean> => {
        return computed(() => hasPermission(permission, serverId));
    };

    const permissions = {
        // Üzenetkezelés
        sendMessages: computed(() => hasPermission(Permission.SendMessages)),
        readMessages: computed(() => hasPermission(Permission.ViewChannels)),
        readMessageHistory: computed(() => hasPermission(Permission.ReadMessageHistory)),
        manageMessages: computed(() => hasPermission(Permission.ManageMessages)),
        embedLinks: computed(() => hasPermission(Permission.EmbedLinks)),
        attachFiles: computed(() => hasPermission(Permission.AttachFiles)),
        addReactions: computed(() => hasPermission(Permission.AddReactions)),
        useExternalEmojis: computed(() => hasPermission(Permission.UseExternalEmojis)),

        // Csatornakezelés
        viewChannels: computed(() => hasPermission(Permission.ViewChannels)),
        manageChannels: computed(() => hasPermission(Permission.ManageChannels)),

        // Hangcsatorna jogosultságok
        connectToVoice: computed(() => hasPermission(Permission.Connect)),
        speakInVoice: computed(() => hasPermission(Permission.Speak)),
        muteMembers: computed(() => hasPermission(Permission.MuteMembers)),
        deafenMembers: computed(() => hasPermission(Permission.DeafenMembers)),
        moveMembers: computed(() => hasPermission(Permission.MoveMembers)),

        // Szerverkezelés
        manageServer: computed(() => hasPermission(Permission.ManageServer)),
        manageRoles: computed(() => hasPermission(Permission.ManageRoles)),
        manageEmojis: computed(() => hasPermission(Permission.ManageEmojis)),
        viewAuditLog: computed(() => hasPermission(Permission.ViewAuditLog)),

        // Tagkezelés
        kickMembers: computed(() => hasPermission(Permission.KickMembers)),
        banMembers: computed(() => hasPermission(Permission.BanMembers)),

        // Meghívók
        createInvite: computed(() => hasPermission(Permission.CreateInvite)),

        // Speciális jogok
        administrator: computed(() => hasPermission(Permission.Administrator)),
        mentionEveryone: computed(() => hasPermission(Permission.MentionEveryone)),

        // Tulajdonosi státusz
        isOwner: computed(() => appStore.currentServer?.isOwner ?? false),
    };

    const getPermissionInfo = (serverId?: EntityId): ComputedRef<PermissionCheckResult> => {
        return computed(() => {
            const server = serverId
                ? appStore.servers.find(s => s.id === serverId)
                : appStore.currentServer;

            if (!server) {
                return { hasPermission: false, isOwner: false, isAdministrator: false };
            }

            const isOwner = server.isOwner;
            const isAdministrator = isOwner || hasPermission(Permission.Administrator, serverId);

            return { hasPermission: true, isOwner, isAdministrator };
        });
    };

    const canInChannel = (permission: Permission): ComputedRef<boolean> => {
        return computed(() => {
            // TODO: Később itt lehetne csatorna-specifikus felülírásokat kezelni
            return hasPermission(permission);
        });
    };

    if (!permissionDetailsInstance) {
        permissionDetailsInstance = {
            [Permission.None]: { name: 'None', description: 'Nothing' },
            [Permission.ViewChannels]: { name: 'View Channels', description: 'Allows members to view and connect to channels' },
            [Permission.ManageChannels]: { name: 'Manage Channels', description: 'Allows members to send messages in text channels' },
            [Permission.ManageRoles]: { name: 'Manage Roles', description: 'Allows members to create, edit, and delete roles' },
            [Permission.ManageEmojis]: { name: 'Manage Emojis', description: 'Allows members to manage custom emojis' },
            [Permission.ViewAuditLog]: { name: 'View Audit Log', description: 'Allows members to view the server audit log' },
            [Permission.ManageServer]: { name: 'Manage Server', description: 'Allows members to manage server settings' },
            [Permission.CreateInvite]: { name: 'Create Invite', description: 'Allows members to create invites for the server' },
            [Permission.KickMembers]: { name: 'Kick Members', description: 'Allows members to kick other members from the server' },
            [Permission.BanMembers]: { name: 'Ban Members', description: 'Allows members to ban other members from the server' },
            [Permission.SendMessages]: { name: 'Send Messages', description: 'Allows members to send messages in text channels' },
            [Permission.EmbedLinks]: { name: 'Embed Links', description: 'Allows members to embed links in messages' },
            [Permission.AttachFiles]: { name: 'Attach Files', description: 'Allows members to attach files in messages' },
            [Permission.AddReactions]: { name: 'Add Reactions', description: 'Allows members to add reactions to messages' },
            [Permission.UseExternalEmojis]: { name: 'Use External Emojis', description: 'Allows members to use external emojis in messages' },
            [Permission.MentionEveryone]: { name: 'Mention @everyone', description: 'Allows members to mention @everyone in messages' },
            [Permission.ManageMessages]: { name: 'Manage Messages', description: 'Allows members to manage messages in text channels' },
            [Permission.ReadMessageHistory]: { name: 'Read Message History', description: 'Allows members to read message history in channels' },
            [Permission.Connect]: { name: 'Connect to Voice', description: 'Allows members to connect to voice channels' },
            [Permission.Speak]: { name: 'Speak in Voice', description: 'Allows members to speak in voice channels' },
            [Permission.MuteMembers]: { name: 'Mute Members', description: 'Allows members to mute other members in voice channels' },
            [Permission.DeafenMembers]: { name: 'Deafen Members', description: 'Allows members to deafen other members in voice channels' },
            [Permission.MoveMembers]: { name: 'Move Members', description: 'Allows members to move other members between voice channels' },
            [Permission.Administrator]: { name: 'Administrator', description: 'Grants all permissions and overrides all channel permissions' },
        };
    }

    const hasPermissionThroughRoles = (permission: Permission): boolean => {
        const member = appStore.members.find(m => m.userId === appStore.currentUserId);
        if (!member) return false;

        if (member.roles.length === 0) {
            // TODO: @everyone szerepkör jogainak ellenőrzése
            return false;
        }

        return member.roles.some(role => {
            if ((role.permissions & Permission.Administrator) !== 0) return true;
            return (role.permissions & permission) !== 0;
        });
    };

    const getHighestRole = (): ComputedRef<Role | null> => {
        return computed(() => {
            const member = appStore.members.find(m => m.userId === appStore.currentUserId);
            if (!member || member.roles.length === 0) return null;

            // Lemásoljuk a tömböt, hogy ne módosítsuk az eredetit a store-ban
            return [...member.roles].sort((a, b) => b.position - a.position)[0];
        });
    };

    const canManageMember = (targetUserId: EntityId): ComputedRef<boolean> => {
        return computed(() => {
            const server = appStore.currentServer;
            if (!server) return false;
            if (server.isOwner) return true;
            if (hasPermission(Permission.Administrator)) {
                const targetMember = appStore.members.find(m => m.userId === targetUserId);
                return targetMember?.userId !== server.ownerId;
            }

            const currentMember = appStore.members.find(m => m.userId === appStore.currentUserId);
            const targetMember = appStore.members.find(m => m.userId === targetUserId);

            if (!currentMember || !targetMember) return false;

            const currentHighestRole = Math.max(0, ...currentMember.roles.map(r => r.position));
            const targetHighestRole = Math.max(0, ...targetMember.roles.map(r => r.position));

            return currentHighestRole > targetHighestRole;
        });
    };

    const debugPermissions = (serverId?: EntityId): void => {
        const server = serverId
            ? appStore.servers.find(s => s.id === serverId)
            : appStore.currentServer;

        if (!server || !('currentUserPermissions' in server)) {
            
            return;
        }

        const serverDetails = server as ServerDetails;
        // debug output removed

        Object.entries(Permission).forEach(([, value]) => {
            if (typeof value === 'number' && (serverDetails.currentUserPermissions & value) !== 0) {
                
            }
        });
    };

    return {
        // Alapvető ellenőrzések
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        can,
        // Előre definiált computed property-k
        permissions,
        // Szerepkör-alapú funkciók
        hasPermissionThroughRoles,
        getHighestRole,
        canManageMember,
        // Segédfüggvények
        getPermissionInfo,
        canInChannel,
        permissionDetails: permissionDetailsInstance,
        debugPermissions,
    };
}
