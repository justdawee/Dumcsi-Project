<template>
  <div class="flex flex-col h-screen bg-gray-900">
    <!-- Channel Header -->
    <div class="flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-700 flex-shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <Hash class="w-5 h-5 text-gray-400 flex-shrink-0" />
        <h2 class="text-lg font-semibold text-white truncate">{{ currentChannel?.name || 'Loading...' }}</h2>
        <span v-if="channelDescription" class="text-sm text-gray-400 hidden md:inline truncate">{{ channelDescription }}</span>
      </div>
      <button
          @click="isMemberListOpen = !isMemberListOpen"
          class="p-2 text-gray-400 hover:text-white transition"
          title="Toggle Member List"
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

        <div class="px-4 pb-4">
          <MessageInput
              v-if="currentChannel && permissions.sendMessages"
              :channel="currentChannel"
              @send="handleSendMessage"
          />
          <div v-else-if="!permissions.sendMessages" class="text-center text-gray-400 text-sm py-2">
            You do not have permission to send messages in this channel.
          </div>
        </div>
      </div>

      <div v-if="isMemberListOpen" class="w-60 bg-gray-900 border-l border-gray-700 p-4 animate-slide-in flex flex-col">
        <h3 class="font-semibold text-white mb-4">Members - {{ members.length }}</h3>
        <div v-if="appStore.loading.members" class="flex justify-center items-center h-full">
          <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
        </div>
        <ul v-else class="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
          <li v-for="member in members" :key="member.userId" class="flex items-center gap-3">
            <UserAvatar
                :avatar-url="member.avatarUrl"
                :username="member.username"
                :size="'sm'"
            />
            <div class="flex-1 min-w-0">
              <span class="text-gray-300 font-medium text-sm truncate block">
                {{ member.serverNickname || member.username }}
              </span>
              <span v-if="member.roles.length > 0" class="text-xs text-gray-500">
                {{ member.roles[0].name }}
              </span>
            </div>
            <!-- Moderációs gombok -->
            <div v-if="canManageMember(member.userId).value" class="flex gap-1">
              <button
                  v-if="permissions.kickMembers"
                  @click="kickMember(member.userId)"
                  class="p-1 text-gray-400 hover:text-red-400 transition"
                  title="Kick Member"
              >
                <UserX class="w-4 h-4" />
              </button>
              <button
                  v-if="permissions.banMembers"
                  @click="banMember(member.userId)"
                  class="p-1 text-gray-400 hover:text-red-500 transition"
                  title="Ban Member"
              >
                <Ban class="w-4 h-4" />
              </button>
            </div>
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
import { usePermissions } from '@/composables/usePermissions';
import { debounce } from '@/utils/helpers';
import { Hash, Users, Loader2, UserX, Ban } from 'lucide-vue-next';
import MessageItem from '@/components/message/MessageItem.vue';
import MessageInput from '@/components/message/MessageInput.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import {
  type CreateMessageRequest,
  type UpdateMessageRequest,
  type EntityId,
} from '@/services/types';

const route = useRoute();
const authStore = useAuthStore();
const appStore = useAppStore();
const { addToast } = useToast();

// Permission composable használata
const { permissions, canManageMember } = usePermissions();

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

const loadChannelData = async (channelId: EntityId) => {
  await appStore.fetchChannel(channelId);
  await scrollToBottom();
};

// --- Event Handlers ---

const debouncedScrollHandler = debounce(() => {
  if (messagesContainer.value && messagesContainer.value.scrollTop < 100) {
    // loadMoreMessages implementáció
  }
}, 200);

const handleSendMessage = async (payload: CreateMessageRequest) => {
  if (!currentChannel.value) return;
  try {
    await appStore.sendMessage(currentChannel.value.id, payload);
    await scrollToBottom('smooth');
  } catch {
    addToast({ type: 'danger', message: 'Failed to send message.' });
  }
};

const handleEditMessage = (payload: { messageId: EntityId; content: UpdateMessageRequest }) => {
  appStore.updateMessage(currentChannel.value!.id, payload.messageId, payload.content)
      .catch(() => addToast({ type: 'danger', message: 'Failed to edit message.' }));
};

const handleDeleteMessage = (messageId: EntityId) => {
  appStore.deleteMessage(currentChannel.value!.id, messageId)
      .catch(() => addToast({ type: 'danger', message: 'Failed to delete message.' }));
};

const kickMember = async (userId: EntityId) => {
  // TODO: Implement kick member
  addToast({ type: 'info', message: 'Kick member functionality coming soon!' });
};

const banMember = async (userId: EntityId) => {
  // TODO: Implement ban member
  addToast({ type: 'info', message: 'Ban member functionality coming soon!' });
};

// --- Lifecycle & Watchers ---

onMounted(() => {
  const channelId = parseInt(route.params.channelId as string, 10);
  if (channelId) {
    loadChannelData(channelId);
  }
});

watch(() => route.params.channelId, (newId) => {
  const newChannelId = newId ? parseInt(newId as string, 10) : null;
  if (newChannelId && newChannelId !== currentChannel.value?.id) {
    loadChannelData(newChannelId);
  }
}, { immediate: true });
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