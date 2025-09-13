import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import friendService from '@/services/friendService';
import router from '@/router';
import dmService from '@/services/dmService';
import { useAppStore } from './app';
import { useToast } from '@/composables/useToast';
import { i18n } from '@/i18n';
import type { EntityId, FriendListItem, FriendRequestItem, BlockedUserItem, DmRequestItem, DmFilterOption } from '@/services/types';

export const useFriendStore = defineStore('friends', () => {
    const friends = ref<FriendListItem[]>([]);
    const requests = ref<FriendRequestItem[]>([]);
    const blocked = ref<BlockedUserItem[]>([]);
    const dmRequests = ref<DmRequestItem[]>([]);
    const dmFilter = ref<DmFilterOption>(0);
    const loading = ref(false);

    const appStore = useAppStore();
    const { addToast } = useToast();

    const friendsWithStatus = computed(() =>
        friends.value.map(f => ({ ...f, online: appStore.onlineUsers.has(f.userId) }))
    );

    const fetchFriends = async () => {
        loading.value = true;
        try {
            friends.value = await friendService.getFriends();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        } finally {
            loading.value = false;
        }
    };

    const fetchRequests = async () => {
        try {
            requests.value = await friendService.getFriendRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const fetchBlocked = async () => {
        try {
            blocked.value = await friendService.getBlocked();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const sendRequest = async (username: string) => {
        try {
            await friendService.sendFriendRequest(username);
            fetchRequests();
        } catch (err: any) {
            const code: string | undefined = err?.response?.data?.error?.code;
            if (code === 'FRIEND_REQUEST_EXISTS') {
                addToast({
                    type: 'info',
                    title: i18n.global.t('friends.toasts.requestAlreadySent.title'),
                    message: i18n.global.t('friends.toasts.requestAlreadySent.message'),
                    actions: [
                        { label: i18n.global.t('friends.actions.openFriends'), variant: 'primary', action: () => { void router.push('/friends'); } }
                    ]
                });
                return;
            }
            if (code === 'FRIEND_REQUEST_PENDING_RESPONSE') {
                addToast({
                    type: 'info',
                    title: i18n.global.t('friends.toasts.respondToRequest.title'),
                    message: i18n.global.t('friends.toasts.respondToRequest.message'),
                    actions: [
                        { label: i18n.global.t('friends.actions.openFriends'), variant: 'primary', action: () => { void router.push('/friends'); } }
                    ]
                });
                // Refresh requests so badge/requests list reflect latest
                try { await fetchRequests(); } catch {}
                return;
            }
            if (code === 'FRIEND_ALREADY') {
                addToast({ type: 'info', title: i18n.global.t('friends.toasts.alreadyFriends.title'), message: i18n.global.t('friends.toasts.alreadyFriends.message') });
                return;
            }
            if (code === 'FRIEND_BLOCKED_BY_YOU') {
                addToast({ type: 'warning', title: i18n.global.t('friends.toasts.blockedByYou.title'), message: i18n.global.t('friends.toasts.blockedByYou.message'), actions: [ { label: i18n.global.t('friends.actions.openFriends'), variant: 'primary', action: () => { void router.push('/friends'); } } ] });
                return;
            }
            if (code === 'FRIEND_BLOCKED_BY_OTHER') {
                addToast({ type: 'warning', title: i18n.global.t('friends.toasts.blockedByOther.title'), message: i18n.global.t('friends.toasts.blockedByOther.message') });
                return;
            }
            if (code === 'FRIEND_USER_NOT_FOUND') {
                addToast({ type: 'warning', title: i18n.global.t('friends.toasts.userNotFound.title'), message: i18n.global.t('friends.toasts.userNotFound.message') });
                return;
            }
            if (code === 'FRIEND_SELF') {
                addToast({ type: 'warning', title: i18n.global.t('friends.toasts.invalidSelf.title'), message: i18n.global.t('friends.toasts.invalidSelf.message') });
                return;
            }
            addToast({ type: 'danger', message: err?.response?.data?.message || err.message || i18n.global.t('friends.toasts.sendRequestFailed') });
            throw err;
        }
    };

    const acceptRequest = async (id: EntityId) => {
        try {
            await friendService.acceptFriendRequest(id);
            await fetchFriends();
            await fetchRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const declineRequest = async (id: EntityId) => {
        try {
            await friendService.declineFriendRequest(id);
            await fetchRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const removeFriend = async (id: EntityId) => {
        try {
            await friendService.removeFriend(id);
            await fetchFriends();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const blockUser = async (id: EntityId) => {
        try {
            await friendService.blockUser(id);
            addToast({ type: 'success', message: i18n.global.t('friends.toasts.userBlocked') });
            await Promise.all([fetchBlocked(), fetchFriends(), fetchRequests()]);
        } catch (err: any) {
            const code: string | undefined = err?.response?.data?.error?.code;
            if (code === 'BLOCK_SELF') {
                addToast({ type: 'warning', message: i18n.global.t('friends.toasts.cannotBlockSelf') });
                return;
            }
            addToast({ type: 'danger', message: err?.response?.data?.message || err.message || i18n.global.t('friends.toasts.blockFailed') });
        }
    };

    const unblockUser = async (id: EntityId) => {
        try {
            await friendService.unblockUser(id);
            addToast({ type: 'success', message: i18n.global.t('friends.toasts.userUnblocked') });
            await fetchBlocked();
        } catch (err: any) {
            addToast({ type: 'danger', message: err?.response?.data?.message || err.message || i18n.global.t('friends.toasts.unblockFailed') });
        }
    };

    // Realtime helpers
    const addIncomingRequest = (req: FriendRequestItem) => {
        if (!requests.value.some(r => r.requestId === req.requestId)) {
            requests.value.unshift(req);
        }
    };
    const removeRequestById = (requestId: EntityId) => {
        requests.value = requests.value.filter(r => r.requestId !== requestId);
    };
    const addFriendRealtime = (friend: FriendListItem) => {
        if (!friends.value.some(f => f.userId === friend.userId)) {
            friends.value.push(friend);
        }
    };
    const removeFriendRealtime = (userId: EntityId) => {
        friends.value = friends.value.filter(f => f.userId !== userId);
    };

    const fetchDmSettings = async () => {
        try {
            const settings = await dmService.getSettings();
            dmFilter.value = settings.filter;
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const updateDmSettings = async (filter: DmFilterOption) => {
        try {
            await dmService.updateSettings(filter);
            dmFilter.value = filter;
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const fetchDmRequests = async () => {
        try {
            dmRequests.value = await dmService.getRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const acceptDmRequest = async (id: EntityId) => {
        try {
            await dmService.acceptRequest(id);
            await fetchDmRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const declineDmRequest = async (id: EntityId) => {
        try {
            await dmService.declineRequest(id);
            await fetchDmRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    return {
        friends,
        requests,
        blocked,
        dmRequests,
        dmFilter,
        loading,
        friendsWithStatus,
        fetchFriends,
        fetchRequests,
        fetchBlocked,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        blockUser,
        unblockUser,
        fetchDmSettings,
        updateDmSettings,
        fetchDmRequests,
        acceptDmRequest,
        declineDmRequest,
        // realtime helpers
        addIncomingRequest,
        removeRequestById,
        addFriendRealtime,
        removeFriendRealtime,
    };
});
