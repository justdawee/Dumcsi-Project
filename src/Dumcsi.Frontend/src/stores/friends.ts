import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import friendService from '@/services/friendService';
import router from '@/router';
import dmService from '@/services/dmService';
import { useAppStore } from './app';
import { useToast } from '@/composables/useToast';
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
                    title: 'Request Already Sent',
                    message: 'You already have a pending friend request to this user.',
                    actions: [
                        { label: 'Open Friends', variant: 'primary', action: () => { void router.push('/friends'); } }
                    ]
                });
                return;
            }
            if (code === 'FRIEND_REQUEST_PENDING_RESPONSE') {
                addToast({
                    type: 'info',
                    title: 'Respond to Request',
                    message: 'This user has already sent you a request. Please accept or decline it in Friends.',
                    actions: [
                        { label: 'Open Friends', variant: 'primary', action: () => { void router.push('/friends'); } }
                    ]
                });
                // Refresh requests so badge/requests list reflect latest
                try { await fetchRequests(); } catch {}
                return;
            }
            if (code === 'FRIEND_ALREADY') {
                addToast({ type: 'info', title: 'Already Friends', message: 'You are already friends with this user.' });
                return;
            }
            if (code === 'FRIEND_BLOCKED_BY_YOU') {
                addToast({ type: 'warning', title: 'Blocked', message: 'You have blocked this user. Unblock them to send a request.', actions: [ { label: 'Open Friends', variant: 'primary', action: () => { void router.push('/friends'); } } ] });
                return;
            }
            if (code === 'FRIEND_BLOCKED_BY_OTHER') {
                addToast({ type: 'warning', title: 'Blocked', message: 'This user has blocked you.' });
                return;
            }
            if (code === 'FRIEND_USER_NOT_FOUND') {
                addToast({ type: 'warning', title: 'User Not Found', message: 'No user exists with that name.' });
                return;
            }
            if (code === 'FRIEND_SELF') {
                addToast({ type: 'warning', title: 'Invalid', message: 'You cannot add yourself.' });
                return;
            }
            addToast({ type: 'danger', message: err?.response?.data?.message || err.message || 'Failed to send request' });
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
            addToast({ type: 'success', message: 'User blocked' });
            await Promise.all([fetchBlocked(), fetchFriends(), fetchRequests()]);
        } catch (err: any) {
            const code: string | undefined = err?.response?.data?.error?.code;
            if (code === 'BLOCK_SELF') {
                addToast({ type: 'warning', message: 'You cannot block yourself.' });
                return;
            }
            addToast({ type: 'danger', message: err?.response?.data?.message || err.message || 'Failed to block user' });
        }
    };

    const unblockUser = async (id: EntityId) => {
        try {
            await friendService.unblockUser(id);
            addToast({ type: 'success', message: 'User unblocked' });
            await fetchBlocked();
        } catch (err: any) {
            addToast({ type: 'danger', message: err?.response?.data?.message || err.message || 'Failed to unblock user' });
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
