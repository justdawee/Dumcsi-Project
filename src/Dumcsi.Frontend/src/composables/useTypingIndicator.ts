import {ref, onUnmounted, computed, type Ref, watch} from 'vue';
import {useAppStore} from '@/stores/app';
import {signalRService} from '@/services/signalrService';
import {useUserDisplay} from './useUserDisplay';
import type {EntityId} from '@/services/types';

export function useTypingIndicator(channelId: Ref<EntityId>) {
    // --- State & Refs ---
    const appStore = useAppStore();
    const {getDisplayName} = useUserDisplay();
    const typingTimeout = ref<ReturnType<typeof setTimeout>>();
    const lastTypingNotification = ref(0);

    // --- Computed Properties ---

    const typingUsers = computed(() => {
        const channelTypingUserIds = appStore.typingUsers.get(channelId.value) || new Set();
        return Array.from(channelTypingUserIds)
            .filter(userId => userId !== appStore.currentUserId)
            .map(userId => appStore.members.find(m => m.userId === userId))
            .filter(Boolean); // Filter out any potential undefined users
    });

    const typingIndicatorText = computed(() => {
        const users = typingUsers.value;
        if (users.length === 0) return '';
        if (users.length === 1) return `${getDisplayName(users[0])} is typing...`;
        if (users.length === 2) return `${getDisplayName(users[0])} and ${getDisplayName(users[1])} are typing...`;
        return `${getDisplayName(users[0])} and ${users.length - 1} others are typing...`;
    });

    // --- Methods ---

    const stopTypingIndicator = (id: EntityId = channelId.value) => {
        if (typingTimeout.value) {
            clearTimeout(typingTimeout.value);
            typingTimeout.value = undefined;
        }
        lastTypingNotification.value = 0;
        if (signalRService.isConnected) {
            signalRService.stopTypingIndicator(id);
        }
    };

    const sendTypingIndicator = () => {
        const now = Date.now();
        if (now - lastTypingNotification.value > 2000) {
            lastTypingNotification.value = now;
            if (signalRService.isConnected) {
                signalRService.sendTypingIndicator(channelId.value);
            }
        }

        if (typingTimeout.value) {
            clearTimeout(typingTimeout.value);
        }

        typingTimeout.value = setTimeout(() => {
            stopTypingIndicator();
        }, 3000);
    };

    // --- Lifecycle Hooks ---

    onUnmounted(() => {
        if (typingTimeout.value) {
            clearTimeout(typingTimeout.value);
        }
        stopTypingIndicator();
    });

    watch(channelId, (_newId, oldId) => {
        if (oldId !== undefined) {
            stopTypingIndicator(oldId);
            appStore.typingUsers.delete(oldId);
        }
    });

    return {
        typingIndicatorText,
        sendTypingIndicator,
        stopTypingIndicator,
    };
}
