import { ref, onUnmounted, type Ref } from 'vue';
import { signalRService } from '@/services/signalrService';
import type { EntityId } from '@/services/types';

export function useDmTypingIndicator(dmUserId: Ref<EntityId>) {
  const typingTimeout = ref<ReturnType<typeof setTimeout>>();
  const lastTypingNotification = ref(0);

  const stopTypingIndicator = (targetId: EntityId = dmUserId.value) => {
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value);
      typingTimeout.value = undefined;
    }
    lastTypingNotification.value = 0;
    try {
      signalRService.stopDmTypingIndicator(targetId);
    } catch {}
  };

  const sendTypingIndicator = () => {
    const now = Date.now();
    if (now - lastTypingNotification.value > 2000) {
      lastTypingNotification.value = now;
      try {
        signalRService.sendDmTypingIndicator(dmUserId.value);
      } catch {}
    }

    if (typingTimeout.value) clearTimeout(typingTimeout.value);
    typingTimeout.value = setTimeout(() => {
      stopTypingIndicator();
    }, 3000);
  };

  onUnmounted(() => {
    if (typingTimeout.value) clearTimeout(typingTimeout.value);
    stopTypingIndicator();
  });

  return {
    sendTypingIndicator,
    stopTypingIndicator,
  };
}

