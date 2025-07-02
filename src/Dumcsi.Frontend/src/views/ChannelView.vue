<template>
  <div class="flex-1 flex flex-col bg-gray-800 h-full overflow-hidden">
    <!-- Fejléc (Header) -->
    <div class="px-6 py-3 border-b border-gray-700 flex items-center justify-between shadow-xs flex-shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <Hash class="w-5 h-5 text-gray-400 flex-shrink-0" />
        <h3 class="font-semibold text-white truncate">{{ currentChannel?.name }}</h3>
        <span v-if="currentChannel?.description" class="text-sm text-gray-400 ml-2 truncate hidden sm:block">
          {{ currentChannel.description }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button @click="toggleMemberList" class="p-2 hover:bg-gray-700 rounded-md transition" title="Toggle Member List">
          <Users class="w-5 h-5 text-gray-400" />
        </button>
        <!-- TODO: Keresés az üzenetek között funkció -->
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Üzenetek konténere -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto scrollbar-thin p-4"
        @scroll="handleScroll"
      >
        <!-- Töltésjelzők és üzenetek -->
        <MessageItem
          v-for="(message, index) in messages"
          :key="message.id"
          :message="message"
          :previous-message="messages[index - 1]"
          :current-user-id="authStore.user?.id"
          @edit="handleEditMessage"
          @delete="handleDeleteMessage"
        />
      </div>

      <!-- Taglista (Member List) -->
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

    <!-- Üzenetküldő input -->
    <div class="px-4 pb-4 pt-2 border-t border-gray-700/50">
      <MessageInput
        v-if="appStore.currentChannel"
        :channel-name="appStore.currentChannel.name"
        @send="handleSendMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { Hash, Users, Loader2 } from 'lucide-vue-next';
import MessageItem from '@/components/message/MessageItem.vue';
import MessageInput from '@/components/message/MessageInput.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import messageService from '@/services/messageService';
import type { UpdateMessagePayload } from '@/services/types';

const route = useRoute();
const authStore = useAuthStore();
const appStore = useAppStore();

const messagesContainer = ref<HTMLElement | null>(null);
const hasMoreMessages = ref(true);
const isMemberListOpen = ref(true); // Alapértelmezetten legyen nyitva

const currentChannel = computed(() => appStore.currentChannel);
const messages = computed(() => appStore.messages);
const members = computed(() => appStore.members);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const loadChannel = async (channelId: number) => {
  hasMoreMessages.value = true;
  await appStore.fetchChannel(channelId);
  await scrollToBottom();
};

const loadMoreMessages = async () => {
  if (!currentChannel.value || messages.value.length === 0 || !hasMoreMessages.value) return;
  
  const oldestMessageId = messages.value[0].id;
  const oldScrollHeight = messagesContainer.value?.scrollHeight ?? 0;
  
  const initialMessageCount = messages.value.length;
  await appStore.fetchMessages(currentChannel.value.id, oldestMessageId);
  
  // Ellenőrizzük, hogy érkezett-e új üzenet
  if (messages.value.length === initialMessageCount) {
    hasMoreMessages.value = false;
  }

  await nextTick();
  if (messagesContainer.value) {
    const newScrollHeight = messagesContainer.value.scrollHeight;
    messagesContainer.value.scrollTop = newScrollHeight - oldScrollHeight;
  }
};

const handleScroll = () => {
  if (messagesContainer.value && messagesContainer.value.scrollTop < 100 && hasMoreMessages.value && !appStore.loading.messages) {
    loadMoreMessages();
  }
};

const handleSendMessage = async (content: string) => {
  if (!currentChannel.value) return;
  try {
    await appStore.sendMessage(currentChannel.value.id, { content });
    await scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

const handleEditMessage = async ({ messageId, content }: { messageId: number; content: UpdateMessagePayload }) => {
  if (!currentChannel.value) return;
  try {
    await messageService.editMessage(currentChannel.value.id, messageId, content);
    const message = messages.value.find(m => m.id === messageId);
    if (message) {
      message.content = content.content;
      message.editedAt = new Date().toISOString(); // Szimuláljuk a frissítést a UI-on
    }
  } catch (error) {
    console.error('Failed to edit message:', error);
  }
};

const handleDeleteMessage = async (messageId: number) => {
  if (!currentChannel.value) return;
  try {
    await messageService.deleteMessage(currentChannel.value.id, messageId);
    const messageIndex = messages.value.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      messages.value.splice(messageIndex, 1);
    }
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
};

const toggleMemberList = () => {
  isMemberListOpen.value = !isMemberListOpen.value;
};

onMounted(() => {
  const channelId = parseInt(route.params.channelId as string, 10);
  if (channelId) {
    loadChannel(channelId);
  }
});

watch(() => route.params.channelId, (newChannelId) => {
  if (newChannelId) {
    loadChannel(parseInt(newChannelId as string, 10));
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
