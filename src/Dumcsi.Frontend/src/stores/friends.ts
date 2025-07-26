import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import friendService from '@/services/friendService';
import dmService from '@/services/dmService';
import { useAppStore } from './app';
import { useToast } from '@/composables/useToast';
import type { EntityId, FriendListItem, FriendRequestItem, DmRequestItem, DmFilterOption } from '@/services/types';

export const useFriendStore = defineStore('friends', () => {
    const friends = ref<FriendListItem[]>([]);
    const requests = ref<FriendRequestItem[]>([]);
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

    const sendRequest = async (username: string) => {
        try {
            await friendService.sendFriendRequest(username);
            addToast({ type: 'success', message: 'Request sent' });
            fetchRequests();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
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
        dmRequests,
        dmFilter,
        loading,
        friendsWithStatus,
        fetchFriends,
        fetchRequests,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        fetchDmSettings,
        updateDmSettings,
        fetchDmRequests,
        acceptDmRequest,
        declineDmRequest,
    };
});