<template>
  <div class="flex flex-col h-screen bg-main-900 overflow-hidden">
    <div class="flex items-center px-4 h-14 border-b border-main-700 flex-shrink-0">
      <UserAvatar :user-id="userId" :username="username" :size="32" class="mr-2" />
      <h2 class="text-lg font-semibold text-text-default truncate">{{ username || t('dm.header.loading') }}</h2>
    </div>
    <div class="flex-1 flex flex-col overflow-hidden">
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800" @scroll="debouncedScrollHandler">
        <div v-if="dmStore.loadingMessages.get(userId)" class="flex justify-center p-4">
          <Loader2 class="w-6 h-6 text-text-tertiary animate-spin" />
        </div>
        <div v-else-if="messages.length === 0" class="text-center text-text-muted">
          <p>{{ t('dm.empty.noMessages') }}</p>
          <p class="text-sm">{{ t('dm.empty.start') }}</p>
        </div>
        <div v-else>
          <UniversalMessageItem
              v-for="(message, index) in messages"
              :key="message.id"
              :current-user-id="authStore.user?.id"
              :message="message"
              :previous-message="messages[index - 1] || null"
              @delete="handleDeleteMessage"
              @edit="handleEditMessage"
          />
        </div>
      </div>
      <div class="relative px-4 pb-6">
        <!-- Jump to present button -->
        <button
            v-if="showJumpToPresent"
            class="absolute right-6 -top-10 z-10 bg-primary text-white text-sm font-medium px-3 py-1.5 rounded-full shadow hover:bg-primary/90 transition"
            :title="t('dm.jump.title')"
            @click="jumpToPresent"
        >
          {{ t('dm.jump.button') }}
          <span v-if="pendingNewCount > 0" class="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">{{ pendingNewCount }}</span>
        </button>
        <UniversalMessageInput 
            v-if="username" 
            :placeholder="t('dm.input.placeholder', { username })"
            :is-dm="true"
            :dm-user-id="userId"
            @send="handleSend" 
        />
        <Transition name="typing-fade">
          <div
              v-if="chatSettings.showTypingIndicators && isOtherTyping"
              class="typing-indicator text-xs text-text-muted italic absolute left-4 bottom-1"
          >
            <span class="typing-dots"><span></span><span></span><span></span></span>
            {{ t('dm.typing', { username }) }}
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDmStore } from '@/stores/dm';
import { useToast } from '@/composables/useToast';
import { debounce } from '@/utils/helpers';
import userService from '@/services/userService';
import UniversalMessageItem from '@/components/chat/UniversalMessageItem.vue';
import UniversalMessageInput from '@/components/chat/UniversalMessageInput.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { Loader2 } from 'lucide-vue-next';
import type { SendDmMessageRequest, UpdateDmMessageRequest, EntityId } from '@/services/types';
import { useChatSettings } from '@/composables/useChatSettings';

const dmStore = useDmStore();
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const authStore = useAuthStore();
const route = useRoute();
const { addToast } = useToast();
const messagesContainer = ref<HTMLElement | null>(null);

const userId = computed(() => parseInt(route.params.userId as string, 10));
const messages = computed(() => dmStore.messages.get(userId.value) || []);
const username = ref('');

// Auto-follow state for jump to present feature
const shouldAutoFollow = ref(true);
const pendingNewCount = ref(0);
const lastDistanceFromBottom = ref(0);
const showJumpToPresent = computed(() => !shouldAutoFollow.value && (pendingNewCount.value > 0 || lastDistanceFromBottom.value > 200));
const isOtherTyping = computed(() => !!dmStore.typingUsers.get(userId.value));
const { chatSettings } = useChatSettings();

const scrollToBottom = async (behavior: 'smooth' | 'auto' = 'auto') => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior,
    });
  }
};

const updateAutoFollow = () => {
  const el = messagesContainer.value;
  if (!el) return;
  const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
  lastDistanceFromBottom.value = distance;
  shouldAutoFollow.value = distance < 120;
};

// When media finishes loading (images/gifs/videos), adjust scroll if following
const mediaLoadedHandler = () => {
  if (shouldAutoFollow.value) {
    scrollToBottom('auto');
  }
};

const debouncedScrollHandler = debounce(() => {
  updateAutoFollow();
  if (shouldAutoFollow.value) {
    pendingNewCount.value = 0;
  }
}, 100);

const jumpToPresent = async () => {
  pendingNewCount.value = 0;
  await scrollToBottom('smooth');
};

const loadMessages = async () => {
  await dmStore.fetchMessages(userId.value);
  if (!username.value) {
    try {
      const profile = await userService.getUser(userId.value);
      username.value = profile.username;
    } catch {
      username.value = '' + userId.value;
    }
  }
  await scrollToBottom();
};

onMounted(async () => {
  await loadMessages();
  // Initial follow state
  shouldAutoFollow.value = true;
  // Update follow state on resize
  window.addEventListener('resize', updateAutoFollow);
  // Scroll when media completes loading
  window.addEventListener('messageMediaLoaded', mediaLoadedHandler as EventListener);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAutoFollow);
  window.removeEventListener('messageMediaLoaded', mediaLoadedHandler as EventListener);
});
watch(() => route.params.userId, loadMessages);

// Auto-follow incoming messages
watch(
  () => messages.value.length,
  async (newLen, oldLen) => {
    if (newLen > oldLen && shouldAutoFollow.value) {
      await scrollToBottom('smooth');
      // Follow-up scrolls to account for media sizing
      setTimeout(() => { if (shouldAutoFollow.value) scrollToBottom('auto'); }, 80);
      setTimeout(() => { if (shouldAutoFollow.value) scrollToBottom('auto'); }, 220);
    } else if (newLen > oldLen && !shouldAutoFollow.value) {
      pendingNewCount.value += (newLen - oldLen);
    }
  }
);

const handleSend = async (payload: SendDmMessageRequest) => {
  try {
    await dmStore.sendMessage(userId.value, payload);
    await scrollToBottom('smooth');
  } catch {
    addToast({ type: 'danger', message: t('dm.toasts.sendFailed') });
  }
};

const handleEditMessage = async (payload: { messageId: EntityId; content: UpdateDmMessageRequest }) => {
  try {
    await dmStore.updateMessage(userId.value, payload.messageId, payload.content);
  } catch {
    addToast({ type: 'danger', message: t('dm.toasts.editFailed') });
  }
};

const handleDeleteMessage = async (messageId: EntityId) => {
  try {
    await dmStore.deleteMessage(userId.value, messageId);
  } catch {
    addToast({ type: 'danger', message: t('dm.toasts.deleteFailed') });
  }
};
</script>
