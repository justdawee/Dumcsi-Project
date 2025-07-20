import { computed, type ComputedRef } from 'vue';
import { useAppStore } from '@/stores/app';
import { Permission, type ServerDetails, type EntityId, type Role, type ServerListItem } from '@/services/types';

export interface PermissionCheckResult {
    hasPermission: boolean;
    isOwner: boolean;
    isAdministrator: boolean;
}

export function usePermissions() {
    const appStore = useAppStore();

    /**
     * Ellenőrzi, hogy a felhasználónak van-e egy adott jogosultsága az aktuális szerveren.
     * @param permission A vizsgálandó jogosultság.
     * @param serverId Opcionális szerver ID. Ha nincs megadva, az aktuális szervert használja.
     * @returns Igaz, ha a felhasználónak van jogosultsága, egyébként hamis.
     */
    const hasPermission = (permission: Permission, serverId?: EntityId): boolean => {
        const server: ServerDetails | ServerListItem | null = serverId
            ? appStore.servers.find(s => s.id === serverId) ?? null
            : appStore.currentServer;

        if (!server) return false;

        // A szerver tulajdonosának minden jogosultsága megvan.
        if (server.isOwner) return true;

        // Ellenőrizzük, hogy a szerver objektum tartalmaz-e jogosultsági adatokat.
        if (!('currentUserPermissions' in server)) return false;

        const serverDetails = server as ServerDetails;

        // Az adminisztrátori jogosultság minden mást felülír.
        if ((serverDetails.currentUserPermissions & Permission.Administrator) !== 0) return true;

        // Specifikus jogosultság ellenőrzése bitenkénti ÉS művelettel.
        return (serverDetails.currentUserPermissions & permission) !== 0;
    };

    /**
     * Ellenőrzi, hogy a felhasználónak van-e több jogosultsága közül legalább egy.
     */
    const hasAnyPermission = (permissions: Permission[], serverId?: EntityId): boolean => {
        return permissions.some(permission => hasPermission(permission, serverId));
    };

    /**
     * Ellenőrzi, hogy a felhasználónak van-e minden megadott jogosultsága.
     */
    const hasAllPermissions = (permissions: Permission[], serverId?: EntityId): boolean => {
        return permissions.every(permission => hasPermission(permission, serverId));
    };

    /**
     * Reaktív `computed` property egy adott jogosultsághoz.
     */
    const can = (permission: Permission, serverId?: EntityId): ComputedRef<boolean> => {
        return computed(() => hasPermission(permission, serverId));
    };

    /**
     * Gyakran használt jogosultságok `computed` property-jei.
     */
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

    /**
     * Részletes jogosultság információk lekérése.
     */
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

    /**
     * Csatorna-specifikus jogosultság ellenőrzés.
     */
    const canInChannel = (permission: Permission): ComputedRef<boolean> => {
        return computed(() => {
            // TODO: Később itt lehetne csatorna-specifikus felülírásokat kezelni
            return hasPermission(permission);
        });
    };

    /**
     * Helper függvény a jogosultság nevének megjelenítéséhez.
     */
    const getPermissionDisplayName = (permission: Permission): string => {
        const permissionNames: Record<number, string> = {
            [Permission.None]: 'None',
            [Permission.ViewChannels]: 'View Channels',
            [Permission.ManageChannels]: 'Manage Channels',
            [Permission.ManageRoles]: 'Manage Roles',
            [Permission.ManageEmojis]: 'Manage Emojis',
            [Permission.ViewAuditLog]: 'View Audit Log',
            [Permission.ManageServer]: 'Manage Server',
            [Permission.CreateInvite]: 'Create Invite',
            [Permission.KickMembers]: 'Kick Members',
            [Permission.BanMembers]: 'Ban Members',
            [Permission.SendMessages]: 'Send Messages',
            [Permission.EmbedLinks]: 'Embed Links',
            [Permission.AttachFiles]: 'Attach Files',
            [Permission.AddReactions]: 'Add Reactions',
            [Permission.UseExternalEmojis]: 'Use External Emojis',
            [Permission.MentionEveryone]: 'Mention @everyone',
            [Permission.ManageMessages]: 'Manage Messages',
            [Permission.ReadMessageHistory]: 'Read Message History',
            [Permission.Connect]: 'Connect to Voice',
            [Permission.Speak]: 'Speak in Voice',
            [Permission.MuteMembers]: 'Mute Members',
            [Permission.DeafenMembers]: 'Deafen Members',
            [Permission.MoveMembers]: 'Move Members',
            [Permission.Administrator]: 'Administrator',
        };

        return permissionNames[permission] || 'Unknown Permission';
    };

    /**
     * Szerepkör-alapú jogosultság ellenőrzés.
     */
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

    /**
     * Megadja a felhasználó legmagasabb rangú szerepkörét.
     */
    const getHighestRole = (): ComputedRef<Role | null> => {
        return computed(() => {
            const member = appStore.members.find(m => m.userId === appStore.currentUserId);
            if (!member || member.roles.length === 0) return null;

            // Lemásoljuk a tömböt, hogy ne módosítsuk az eredetit a store-ban
            return [...member.roles].sort((a, b) => b.position - a.position)[0];
        });
    };

    /**
     * Ellenőrzi, hogy a felhasználó módosíthat-e egy másik felhasználót.
     */
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

    /**
     * Debug segédfüggvény a jogosultságok konzolra írásához.
     */
    const debugPermissions = (serverId?: EntityId): void => {
        const server = serverId
            ? appStore.servers.find(s => s.id === serverId)
            : appStore.currentServer;

        if (!server || !('currentUserPermissions' in server)) {
            console.log('No permission data available for debugging.');
            return;
        }

        const serverDetails = server as ServerDetails;
        console.log('=== Permission Debug ===');
        console.log('Server:', serverDetails.name);
        console.log('Is Owner:', serverDetails.isOwner);
        console.log('Permission Value:', serverDetails.currentUserPermissions);
        console.log('Active Permissions:');

        Object.entries(Permission).forEach(([key, value]) => {
            if (typeof value === 'number' && (serverDetails.currentUserPermissions & value) !== 0) {
                console.log(`- ${key}: ✓`);
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
        getPermissionDisplayName,
        debugPermissions,
    };
}
