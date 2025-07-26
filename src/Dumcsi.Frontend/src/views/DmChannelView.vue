<template>
  <div class="flex flex-col h-full bg-main-900">
    <div class="flex items-center px-4 h-14 border-b border-main-700 flex-shrink-0">
      <UserAvatar :user-id="userId" :username="username" :size="32" class="mr-2" />
      <h2 class="text-lg font-semibold text-text-default truncate">{{ username || 'Loading...' }}</h2>
    </div>
    <div class="flex-1 flex flex-col">
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        <div v-if="dmStore.loading" class="flex justify-center p-4">
          <Loader2 class="w-6 h-6 text-text-tertiary animate-spin" />
        </div>
        <div v-else-if="messages.length === 0" class="text-center text-text-muted">
          <p>No messages yet.</p>
        </div>
        <div v-else>
          <DmMessageItem
              v-for="message in messages"
              :key="message.id"
              :message="message"
          />
        </div>
      </div>
      <div class="px-4 pb-6">
        <DmMessageInput v-if="username" @send="handleSend" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useDmStore } from '@/stores/dm';
import userService from '@/services/userService';
import DmMessageItem from '@/components/dm/DmMessageItem.vue';
import DmMessageInput from '@/components/dm/DmMessageInput.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { Loader2 } from 'lucide-vue-next';
import { useToast } from '@/composables/useToast';
import type { CreateMessageRequest } from '@/services/types';

const dmStore = useDmStore();
const route = useRoute();
const { addToast } = useToast();
const messagesContainer = ref<HTMLElement | null>(null);

const userId = computed(() => parseInt(route.params.userId as string, 10));
const messages = computed(() => dmStore.messages.get(userId.value) || []);
const username = ref('');

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
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

onMounted(loadMessages);
watch(() => route.params.userId, loadMessages);

const handleSend = async (payload: CreateMessageRequest) => {
  try {
    await dmStore.sendMessage(userId.value, payload.content);
    await scrollToBottom();
  } catch {
    addToast({ type: 'danger', message: 'Failed to send message.' });
  }
};
</script>