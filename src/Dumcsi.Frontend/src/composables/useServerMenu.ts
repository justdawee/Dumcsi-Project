import {ref, computed, type Component} from 'vue';
import {useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {usePermissions} from '@/composables/usePermissions';
import {useToast} from '@/composables/useToast';
import {UserPlus, PlusCircle, Edit, LogOut, Shield, Plus, UserRoundCog} from 'lucide-vue-next';
import serverService from '@/services/serverService';
import type {ServerListItem} from '@/services/types';
import { useI18n } from 'vue-i18n';

export interface MenuItem {
    label: string;
    icon: Component;
    action: () => void;
    danger?: boolean;
}

export function useServerMenu() {
    const router = useRouter();
    const appStore = useAppStore();
    const {permissions} = usePermissions();
    const {addToast} = useToast();
    const { t } = useI18n();

    // Modal states
    const isInviteModalOpen = ref(false);
    const isInviteManagementModalOpen = ref(false);
    const isEditServerModalOpen = ref(false);
    const isManageRolesModalOpen = ref(false);
    const isCreateTopicModalOpen = ref(false);
    const isLeaveConfirmOpen = ref(false);
    const isLeaving = ref(false);

    // Data states
    const selectedServer = ref<ServerListItem | null>(null);
    const generatedInviteCode = ref('');
    const newTopicName = ref('');

    // Current server ID from route
    const currentServerId = computed(() => {
        const route = router.currentRoute.value;
        return route.params.serverId ? parseInt(route.params.serverId as string) : null;
    });

    const handleInvite = async (server: ServerListItem) => {
        try {
            const response = await serverService.generateInvite(server.id);
            selectedServer.value = server;
            generatedInviteCode.value = response.code;
            isInviteModalOpen.value = true;
        } catch (error) {
            addToast({
                message: t('server.invite.errors.generateFailed'),
                type: 'danger'
            });
        }
    };

    const handleCreateChannel = (server: ServerListItem) => {
        if (currentServerId.value !== server.id) {
            router.push({name: 'Server', params: {serverId: server.id}});
        }
        appStore.openCreateChannelModal(server.id);
    };

    const handleEditServer = (server: ServerListItem) => {
        selectedServer.value = server;
        isEditServerModalOpen.value = true;
    };

    const handleLeaveServer = (server: ServerListItem) => {
        selectedServer.value = server;
        isLeaveConfirmOpen.value = true;
    };

    const handleManageRoles = (server: ServerListItem) => {
        selectedServer.value = server;
        isManageRolesModalOpen.value = true;
    };

    const handleCreateTopic = (server: ServerListItem) => {
        selectedServer.value = server;
        newTopicName.value = '';
        isCreateTopicModalOpen.value = true;
    };

    const handleManageInvites = (server: ServerListItem) => {
        selectedServer.value = server;
        isInviteManagementModalOpen.value = true;
    };

    const createTopic = async () => {
        if (!selectedServer.value || !newTopicName.value.trim()) return;

        try {
            await serverService.createTopic(selectedServer.value.id, {name: newTopicName.value.trim()});
            await appStore.fetchServer(selectedServer.value.id);
            addToast({
                message: t('topics.toastCreated'),
                type: 'success'
            });
        } catch (error: any) {
            addToast({
                message: error.message || t('channels.errors.topicCreateFailed'),
                type: 'danger'
            });
        } finally {
            isCreateTopicModalOpen.value = false;
            newTopicName.value = '';
        }
    };

    const confirmLeaveServer = async () => {
        if (!selectedServer.value) return;

        isLeaving.value = true;
        const serverToLeave = selectedServer.value;

        try {
            await appStore.leaveServer(serverToLeave.id);
            addToast({
                message: t('server.leave.toast.left', { name: serverToLeave.name }),
                type: 'success',
                title: t('common.success')
            });
            if (currentServerId.value === serverToLeave.id) {
                router.push({name: 'ServerSelect'});
            }
            appStore.fetchServers();
        } catch (error: any) {
            addToast({
                message: t('server.leave.toast.ownerCannotLeave'),
                type: 'danger',
                title: t('common.error')
            });
        } finally {
            isLeaving.value = false;
            isLeaveConfirmOpen.value = false;
            selectedServer.value = null;
        }
    };

    const getServerMenuItems = (server: ServerListItem): MenuItem[] => {
        const menuItems: MenuItem[] = [];
        const isCurrentServer = server.id === currentServerId.value;

        const canInvite = isCurrentServer ? permissions.createInvite.value : server.isOwner;
        const canManageChannels = isCurrentServer ? permissions.manageChannels.value : server.isOwner;
        const canManageServer = isCurrentServer ? permissions.manageServer.value : server.isOwner;
        const canManageRoles = isCurrentServer ? permissions.manageRoles.value : server.isOwner;

        if (canInvite) {
            menuItems.push({label: t('server.menuItems.invitePeople'), icon: UserPlus, action: () => handleInvite(server)});
            menuItems.push({label: t('server.menuItems.manageInvites'), icon: UserRoundCog, action: () => handleManageInvites(server)});
        }
        if (canManageChannels) {
            menuItems.push({label: t('channels.modal.createTitle'), icon: PlusCircle, action: () => handleCreateChannel(server)});
            menuItems.push({label: t('topics.createTitle'), icon: Plus, action: () => handleCreateTopic(server)});
        }
        if (canManageServer) {
            menuItems.push({label: t('server.settings.title'), icon: Edit, action: () => handleEditServer(server)});
        }
        if (canManageRoles) {
            menuItems.push({label: t('roles.manage.title'), icon: Shield, action: () => handleManageRoles(server)});
        }
        // Separator
        // menuItems.push({ label: '', icon: Bell as any, action: () => {}, } as any);

        if (!server.isOwner) {
            menuItems.push({
                label: t('server.menuItems.leaveServer'),
                icon: LogOut,
                danger: true,
                action: () => handleLeaveServer(server)
            });
        }

        return menuItems;
    };

    return {
        // States
        isInviteModalOpen,
        isInviteManagementModalOpen,
        isEditServerModalOpen,
        isManageRolesModalOpen,
        isCreateTopicModalOpen,
        isLeaveConfirmOpen,
        isLeaving,
        selectedServer,
        generatedInviteCode,
        newTopicName,

        // Methods
        getServerMenuItems,
        createTopic,
        confirmLeaveServer,
        handleInvite,
        handleManageInvites,
        handleCreateChannel,
        handleEditServer,
        handleLeaveServer,
        handleManageRoles,
        handleCreateTopic
    };
}
