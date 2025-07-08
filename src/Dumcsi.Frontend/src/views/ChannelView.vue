<template>
  <div class="flex flex-col h-screen bg-gray-900">
    <!-- Channel Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center gap-2">
        <Hash class="w-5 h-5 text-gray-400" />
        <h2 class="text-lg font-semibold text-white">{{ currentChannel?.name || 'Loading...' }}</h2>
        <span v-if="channelDescription" class="text-sm text-gray-400 hidden md:inline">{{ channelDescription }}</span>
      </div>
      <button 
        @click="isMemberListOpen = !isMemberListOpen"
        class="p-2 text-gray-400 hover:text-white transition"
      >
        <Users class="w-5 h-5" />
      </button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <div class="flex-1 flex flex-col">
        <div 
          ref="messagesContainer" 
          class="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
          @scroll="debouncedScrollHandler"
        >
          <div v-if="appStore.loading.messages" class="flex justify-center p-4">
            <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
          </div>
          <MessageItem
            v-for="(message, index) in messages"
            :key="message.id"
            :message="message"
            :previous-message="messages[index - 1] || null"
            :current-user-id="authStore.user?.id"
            @edit="handleEditMessage"
            @delete="handleDeleteMessage"
          />
        </div>

        <div class="px-4 pb-4 pt-2 border-t border-gray-700/50">
          <MessageInput
            v-if="currentChannel"
            :channel="currentChannel"
            @send="handleSendMessage"
          />
        </div>
      </div>

      <div v-if="isMemberListOpen" class="w-60 bg-gray-800 border-l border-gray-700 p-4 animate-slide-in flex flex-col">
        <h3 class="font-semibold text-white mb-4">Members - {{ members.length }}</h3>
        <div v-if="appStore.loading.members" class="flex justify-center items-center h-full">
          <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
        </div>
        <ul v-else class="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
          <li v-for="member in members" :key="member.userId" class="flex items-center gap-3">
            <UserAvatar
              :avatar-url="member.profilePictureUrl"
              :username="member.username"
              :size="32"
            />
            <span class="text-gray-300 font-medium text-sm truncate">{{ member.username }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import { debounce } from '@/utils/helpers'; // Assuming you have this helper
import { Hash, Users, Loader2 } from 'lucide-vue-next';
import MessageItem from '@/components/message/MessageItem.vue';
import MessageInput from '@/components/message/MessageInput.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type { UpdateMessagePayload, EntityId } from '@/services/types';

const route = useRoute();
const authStore = useAuthStore();
const appStore = useAppStore();
const { addToast } = useToast();

const messagesContainer = ref<HTMLElement | null>(null);
const isMemberListOpen = ref(true);

// State is now derived from the store for a single source of truth
const currentChannel = computed(() => appStore.currentChannel);
const messages = computed(() => appStore.messages);
const members = computed(() => appStore.members);
const channelDescription = computed(() => appStore.currentChannel?.description);

// --- Core Logic ---

const scrollToBottom = async (behavior: 'smooth' | 'auto' = 'auto') => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior,
    });
  }
};

const loadChannel = async (channelId: EntityId) => {
  await appStore.fetchChannel(channelId);
  await scrollToBottom();
};

const loadMoreMessages = async () => {
  if (!currentChannel.value || appStore.loading.messages || messages.value.length === 0) return;

  const oldestMessageId = messages.value[0].id;
  const oldScrollHeight = messagesContainer.value?.scrollHeight ?? 0;

  await appStore.fetchMoreMessages(currentChannel.value.id, oldestMessageId);

  // Restore scroll position after loading older messages
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight - oldScrollHeight;
  }
};

// --- Event Handlers ---

const debouncedScrollHandler = debounce(() => {
  if (messagesContainer.value && messagesContainer.value.scrollTop < 100) {
    loadMoreMessages();
  }
}, 200);

const handleSendMessage = async (content: string) => {
  if (!currentChannel.value) return;
  try {
    await appStore.sendMessage(currentChannel.value.id, { content });
    await scrollToBottom('smooth');
  } catch {
    addToast({ type: 'danger', message: 'Failed to send message.' });
  }
};

const handleEditMessage = (payload: { messageId: EntityId; content: UpdateMessagePayload }) => {
  appStore.editMessage(payload.messageId, payload.content)
    .catch(() => addToast({ type: 'danger', message: 'Failed to edit message.' }));
};

const handleDeleteMessage = (messageId: EntityId) => {
  appStore.deleteMessage(messageId)
    .catch(() => addToast({ type: 'danger', message: 'Failed to delete message.' }));
};

// --- Lifecycle & Watchers ---

onMounted(() => {
  const channelId = parseInt(route.params.channelId as string, 10);
  if (channelId) loadChannel(channelId);
});

watch(() => route.params.channelId, (newChannelId) => {
  if (newChannelId && typeof newChannelId === 'string') {
    loadChannel(parseInt(newChannelId, 10));
  }
});
</script>

<style scoped>
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in {
  animation: slideIn 0.2s ease-out;
}
</style>

<style scoped>
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in {
  animation: slideIn 0.2s ease-out;
}
</style>
