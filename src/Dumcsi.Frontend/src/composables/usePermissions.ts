import {computed, type ComputedRef} from 'vue';
import {useAppStore} from '@/stores/app';
import {Permission, type ServerDetails, type EntityId, type Role} from '@/services/types';

export interface PermissionCheckResult {
    hasPermission: boolean;
    isOwner: boolean;
    isAdministrator: boolean;
}

export function usePermissions() {
    const appStore = useAppStore();

    /**
     * Ellenőrzi, hogy a felhasználónak van-e egy adott jogosultsága az aktuális szerveren
     */
    const hasPermission = (permission: Permission, serverId?: EntityId): boolean => {
        const server = serverId
            ? appStore.servers.find(s => s.id === serverId)
            : appStore.currentServer;

        if (!server) return false;

        // Ha a felhasználó a szerver tulajdonosa, minden joga van
        if (server.isOwner) return true;

        // Ha nincs currentServer (csak ServerListItem), akkor nincs permission info
        if (!('permissions' in server)) return false;

        const serverDetails = server as ServerDetails;

        // Administrator jogosultság minden más jogot magában foglal
        if ((serverDetails.permissions & Permission.Administrator) !== 0) return true;

        // Specifikus jogosultság ellenőrzése
        return (serverDetails.permissions & permission) !== 0;
    };

    /**
     * Ellenőrzi, hogy a felhasználónak van-e több jogosultsága közül legalább egy
     */
    const hasAnyPermission = (permissions: Permission[], serverId?: EntityId): boolean => {
        return permissions.some(permission => hasPermission(permission, serverId));
    };

    /**
     * Ellenőrzi, hogy a felhasználónak van-e minden megadott jogosultsága
     */
    const hasAllPermissions = (permissions: Permission[], serverId?: EntityId): boolean => {
        return permissions.every(permission => hasPermission(permission, serverId));
    };

    /**
     * Reactive computed property egy adott jogosultsághoz
     */
    const can = (permission: Permission, serverId?: EntityId): ComputedRef<boolean> => {
        return computed(() => hasPermission(permission, serverId));
    };

    /**
     * Gyakran használt jogosultságok computed property-jei
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
        sendTTSMessages: computed(() => hasPermission(Permission.SendTTSMessages)),

        // Csatornakezelés
        viewChannels: computed(() => hasPermission(Permission.ViewChannels)),
        manageChannels: computed(() => hasPermission(Permission.ManageChannels)),
        useVoice: computed(() => hasPermission(Permission.UseVoice)),

        // Szerverkezelés
        manageServer: computed(() => hasPermission(Permission.ManageServer)),
        manageRoles: computed(() => hasPermission(Permission.ManageRoles)),
        manageEmojis: computed(() => hasPermission(Permission.ManageEmojis)),
        viewAuditLog: computed(() => hasPermission(Permission.ViewAuditLog)),

        // Tagkezelés
        kickMembers: computed(() => hasPermission(Permission.KickMembers)),
        banMembers: computed(() => hasPermission(Permission.BanMembers)),
        changeNickname: computed(() => hasPermission(Permission.ChangeNickname)),
        manageNicknames: computed(() => hasPermission(Permission.ManageNicknames)),

        // Meghívók
        createInvite: computed(() => hasPermission(Permission.CreateInvite)),

        // Speciális jogok
        administrator: computed(() => hasPermission(Permission.Administrator)),
        mentionEveryone: computed(() => hasPermission(Permission.MentionEveryone)),

        // Tulajdonosi státusz
        isOwner: computed(() => appStore.currentServer?.isOwner ?? false),
    };

    /**
     * Részletes jogosultság információk lekérése
     */
    const getPermissionInfo = (serverId?: EntityId): ComputedRef<PermissionCheckResult> => {
        return computed(() => {
            const server = serverId
                ? appStore.servers.find(s => s.id === serverId)
                : appStore.currentServer;

            if (!server) {
                return {
                    hasPermission: false,
                    isOwner: false,
                    isAdministrator: false,
                };
            }

            const isOwner = server.isOwner;
            const isAdministrator = isOwner || hasPermission(Permission.Administrator, serverId);

            return {
                hasPermission: true,
                isOwner,
                isAdministrator,
            };
        });
    };

    /**
     * Csatorna-specifikus jogosultság ellenőrzés
     */
    const canInChannel = (permission: Permission): ComputedRef<boolean> => {
        return computed(() => {
            // TODO: Később itt lehetne csatorna-specifikus felülírásokat kezelni
            // Egyelőre csak a szerver szintű jogosultságokat nézzük
            return hasPermission(permission);
        });
    };

    /**
     * Helper függvény a jogosultság nevének megjelenítéséhez
     */
    const getPermissionDisplayName = (permission: Permission): string => {
        const permissionNames: Record<Permission, string> = {
            [Permission.None]: 'None',
            [Permission.ViewChannels]: 'View Channels',
            [Permission.ManageChannels]: 'Manage Channels',
            [Permission.ManageRoles]: 'Manage Roles',
            [Permission.ManageServer]: 'Manage Server',
            [Permission.CreateInvite]: 'Create Invites',
            [Permission.ChangeNickname]: 'Change Nickname',
            [Permission.ManageNicknames]: 'Manage Nicknames',
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
            [Permission.SendTTSMessages]: 'Send TTS Messages',
            [Permission.UseVoice]: 'Use Voice',
            [Permission.ManageEmojis]: 'Manage Emojis',
            [Permission.ViewAuditLog]: 'View Audit Log',
            [Permission.Administrator]: 'Administrator',
        };

        return permissionNames[permission] || 'Unknown Permission';
    };

    /**
     * Szerepkör-alapú jogosultság ellenőrzés
     * Ellenőrzi, hogy a felhasználónak van-e olyan szerepköre, ami tartalmazza a kért jogosultságot
     */
    const hasPermissionThroughRoles = (permission: Permission): boolean => {
        const member = appStore.members.find(m => m.userId === appStore.currentUserId);
        if (!member) return false;

        // Ha nincs szerepköre, csak az @everyone jogai vannak
        if (member.roles.length === 0) {
            // TODO: @everyone szerepkör jogainak ellenőrzése
            return false;
        }

        // Ellenőrizzük minden szerepkörben
        return member.roles.some(role => {
            // Administrator szerepkör minden jogot biztosít
            if ((role.permissions & Permission.Administrator) !== 0) return true;
            // Specifikus jogosultság ellenőrzése
            return (role.permissions & permission) !== 0;
        });
    };

    /**
     * Megadja a felhasználó legmagasabb szerepkörét
     */
    const getHighestRole = (): ComputedRef<Role | null> => {
        return computed(() => {
            const member = appStore.members.find(m => m.userId === appStore.currentUserId);
            if (!member || member.roles.length === 0) return null;

            // Szerepkörök rendezése pozíció szerint (magasabb pozíció = magasabb rang)
            return member.roles.sort((a, b) => b.position - a.position)[0];
        });
    };

    /**
     * Ellenőrzi, hogy a felhasználó módosíthat-e egy másik felhasználót
     * (csak akkor lehet, ha magasabb rangú szerepköre van)
     */
    const canManageMember = (targetUserId: EntityId): ComputedRef<boolean> => {
        return computed(() => {
            const server = appStore.currentServer;
            if (!server) return false;

            // Tulajdonos mindenkit kezelhet
            if (server.isOwner) return true;

            // Admin is mindenkit kezelhet (kivéve a tulajdonost)
            if (hasPermission(Permission.Administrator)) {
                const targetMember = appStore.members.find(m => m.userId === targetUserId);
                return targetMember?.userId !== server.ownerId;
            }

            // Különben csak alacsonyabb rangúakat lehet kezelni
            const currentMember = appStore.members.find(m => m.userId === appStore.currentUserId);
            const targetMember = appStore.members.find(m => m.userId === targetUserId);

            if (!currentMember || !targetMember) return false;

            const currentHighestRole = Math.max(...currentMember.roles.map(r => r.position), 0);
            const targetHighestRole = Math.max(...targetMember.roles.map(r => r.position), 0);

            return currentHighestRole > targetHighestRole;
        });
    };

    const debugPermissions = (serverId?: EntityId): void => {
        const server = serverId
            ? appStore.servers.find(s => s.id === serverId)
            : appStore.currentServer;

        if (!server || !('permissions' in server)) {
            console.log('No permission data available');
            return;
        }

        const serverDetails = server as ServerDetails;
        console.log('=== Permission Debug ===');
        console.log('Server:', serverDetails.name);
        console.log('Is Owner:', serverDetails.isOwner);
        console.log('Permission Value:', serverDetails.permissions);
        console.log('Active Permissions:');

        Object.entries(Permission).forEach(([key, value]) => {
            if (typeof value === 'number' && hasPermission(value, serverId)) {
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