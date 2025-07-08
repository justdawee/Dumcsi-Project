import { ref, onUnmounted, computed, type Ref } from 'vue';
import { useAppStore } from '@/stores/app';
import { signalRService } from '@/services/signalrService';
import { useUserDisplay } from './useUserDisplay';
import type { EntityId } from '@/services/types';

export function useTypingIndicator(channelId: Ref<EntityId>) {
  // --- State & Refs ---
  const appStore = useAppStore();
  const { getDisplayName } = useUserDisplay();
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

  const sendTypingIndicator = () => {
    const now = Date.now();
    // Only send if it has been more than 2 seconds since the last notification
    if (now - lastTypingNotification.value > 2000) {
      lastTypingNotification.value = now;
      if (signalRService.isConnected) {
        signalRService.sendTypingIndicator(channelId.value);
      }
    }

    // Clear any existing timeout
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value);
    }

    // Set a new timeout to consider typing stopped after 3 seconds of inactivity
    typingTimeout.value = setTimeout(() => {
      lastTypingNotification.value = 0;
    }, 3000);
  };

  // --- Lifecycle Hooks ---

  onUnmounted(() => {
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value);
    }
  });

  return {
    typingIndicatorText,
    sendTypingIndicator,
  };
}
