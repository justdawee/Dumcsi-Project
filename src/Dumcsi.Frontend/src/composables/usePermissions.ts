import {computed, type ComputedRef} from 'vue';
import { useAppStore } from '@/stores/app';
import { Permission, type ServerDetails, type EntityId, type Role, type ServerListItem } from '@/services/types';
import { useI18n } from 'vue-i18n';

export interface PermissionCheckResult {
    hasPermission: boolean;
    isOwner: boolean;
    isAdministrator: boolean;
}

let permissionDetailsInstance: Record<number, { name: string; description: string }> | null = null;

export function usePermissions() {
    const appStore = useAppStore();
    const { t } = useI18n();

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
            [Permission.None]: { name: t('roles.permissions.None.name'), description: t('roles.permissions.None.description') },
            [Permission.ViewChannels]: { name: t('roles.permissions.ViewChannels.name'), description: t('roles.permissions.ViewChannels.description') },
            [Permission.ManageChannels]: { name: t('roles.permissions.ManageChannels.name'), description: t('roles.permissions.ManageChannels.description') },
            [Permission.ManageRoles]: { name: t('roles.permissions.ManageRoles.name'), description: t('roles.permissions.ManageRoles.description') },
            [Permission.ManageEmojis]: { name: t('roles.permissions.ManageEmojis.name'), description: t('roles.permissions.ManageEmojis.description') },
            [Permission.ViewAuditLog]: { name: t('roles.permissions.ViewAuditLog.name'), description: t('roles.permissions.ViewAuditLog.description') },
            [Permission.ManageServer]: { name: t('roles.permissions.ManageServer.name'), description: t('roles.permissions.ManageServer.description') },
            [Permission.CreateInvite]: { name: t('roles.permissions.CreateInvite.name'), description: t('roles.permissions.CreateInvite.description') },
            [Permission.KickMembers]: { name: t('roles.permissions.KickMembers.name'), description: t('roles.permissions.KickMembers.description') },
            [Permission.BanMembers]: { name: t('roles.permissions.BanMembers.name'), description: t('roles.permissions.BanMembers.description') },
            [Permission.SendMessages]: { name: t('roles.permissions.SendMessages.name'), description: t('roles.permissions.SendMessages.description') },
            [Permission.EmbedLinks]: { name: t('roles.permissions.EmbedLinks.name'), description: t('roles.permissions.EmbedLinks.description') },
            [Permission.AttachFiles]: { name: t('roles.permissions.AttachFiles.name'), description: t('roles.permissions.AttachFiles.description') },
            [Permission.AddReactions]: { name: t('roles.permissions.AddReactions.name'), description: t('roles.permissions.AddReactions.description') },
            [Permission.UseExternalEmojis]: { name: t('roles.permissions.UseExternalEmojis.name'), description: t('roles.permissions.UseExternalEmojis.description') },
            [Permission.MentionEveryone]: { name: t('roles.permissions.MentionEveryone.name'), description: t('roles.permissions.MentionEveryone.description') },
            [Permission.ManageMessages]: { name: t('roles.permissions.ManageMessages.name'), description: t('roles.permissions.ManageMessages.description') },
            [Permission.ReadMessageHistory]: { name: t('roles.permissions.ReadMessageHistory.name'), description: t('roles.permissions.ReadMessageHistory.description') },
            [Permission.Connect]: { name: t('roles.permissions.Connect.name'), description: t('roles.permissions.Connect.description') },
            [Permission.Speak]: { name: t('roles.permissions.Speak.name'), description: t('roles.permissions.Speak.description') },
            [Permission.MuteMembers]: { name: t('roles.permissions.MuteMembers.name'), description: t('roles.permissions.MuteMembers.description') },
            [Permission.DeafenMembers]: { name: t('roles.permissions.DeafenMembers.name'), description: t('roles.permissions.DeafenMembers.description') },
            [Permission.MoveMembers]: { name: t('roles.permissions.MoveMembers.name'), description: t('roles.permissions.MoveMembers.description') },
            [Permission.Administrator]: { name: t('roles.permissions.Administrator.name'), description: t('roles.permissions.Administrator.description') },
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
