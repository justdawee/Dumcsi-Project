<template>
  <div class="flex flex-col h-screen bg-main-900">
    <div class="flex items-center justify-between px-4 h-14 bg-main-900 border-b border-main-700 flex-shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <Hash class="w-5 h-5 text-text-muted flex-shrink-0"/>
        <h2 class="text-lg font-semibold text-text-default truncate">{{ currentChannel?.name || 'Loading...' }}</h2>
        <span v-if="channelDescription" class="text-sm text-text-muted hidden md:inline truncate">{{
            channelDescription
          }}</span>
      </div>
      <button
          class="p-2 text-text-muted hover:text-text-default transition"
          title="Toggle Member List"
          @click="isMemberListOpen = !isMemberListOpen"
      >
        <Users class="w-5 h-5"/>
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
            <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
          </div>
          <div v-else-if="appStore.messages.length === 0" class="text-center text-text-muted">
            <p>No messages in this channel yet.</p>
            <p class="text-sm">Be the first to send a message!</p>
          </div>
          <div v-else>
            <MessageItem
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
          <MessageInput
              ref="messageInputRef"
              v-if="currentChannel && permissions.sendMessages"
              :channel="currentChannel"
              @send="handleSendMessage"
          />
          <div v-else-if="!permissions.sendMessages" class="text-center text-text-muted text-sm py-2">
            You do not have permission to send messages in this channel.
          </div>
          <Transition name="typing-fade">
            <div
                v-if="typingIndicatorText"
                class="typing-indicator text-xs text-text-muted italic absolute left-4 bottom-1"
            >
              <span class="typing-dots"><span></span><span></span><span></span></span>
              {{ typingIndicatorText }}
            </div>
          </Transition>
        </div>
      </div>

      <div v-if="isMemberListOpen" class="w-60 bg-main-900 border-l border-main-700 p-4 animate-slide-in flex flex-col">
        <h3 class="font-semibold text-text-default mb-4">Members - {{ members.length }}</h3>
        <div v-if="appStore.loading.members" class="flex justify-center items-center h-full">
          <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
        </div>
        <ul v-else class="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
          <li v-for="member in members" :key="member.userId" class="flex items-center gap-3">
            <UserAvatar
                :avatar-url="member.avatarUrl"
                :is-typing="isTyping(member.userId)"
                :size="32"
                :user-id="member.userId"
                :username="member.username"
                show-online-indicator
            />
            <div class="flex-1 min-w-0">
              <span class="text-gray-300 font-medium text-sm truncate block">
                {{ getDisplayName(member) }}
              </span>
              <span v-if="member.roles.length > 0" class="text-xs text-text-tertiary">
                {{ member.roles[0].name }}
              </span>
            </div>
            <div v-if="canManageMember(member.userId).value" class="flex gap-1">
              <button
                  v-if="permissions.kickMembers"
                  class="p-1 text-text-muted hover:text-red-400 transition"
                  title="Kick Member"
                  @click="kickMember()"
              >
                <UserX class="w-4 h-4"/>
              </button>
              <button
                  v-if="permissions.banMembers"
                  class="p-1 text-text-muted hover:text-red-500 transition"
                  title="Ban Member"
                  @click="banMember()"
              >
                <Ban class="w-4 h-4"/>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <GlobalFileDrop />
</template>

<script lang="ts" setup>
import {ref, computed, watch, onMounted, onUnmounted, nextTick} from 'vue';
import {useRoute} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {usePermissions} from '@/composables/usePermissions';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {debounce} from '@/utils/helpers';
import {useTypingIndicator} from '@/composables/useTypingIndicator';
import {Hash, Users, Loader2, UserX, Ban} from 'lucide-vue-next';
import MessageItem from '@/components/message/MessageItem.vue';
import MessageInput from '@/components/message/MessageInput.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import GlobalFileDrop from '@/components/ui/GlobalFileDrop.vue';
import {signalRService} from '@/services/signalrService';
import {
  type CreateMessageRequest,
  type UpdateMessageRequest,
  type EntityId,
} from '@/services/types';

const route = useRoute();
const authStore = useAuthStore();
const appStore = useAppStore();
const {addToast} = useToast();
const {getDisplayName} = useUserDisplay();

// Typing indicator text for the current channel using the composable
const channelIdRef = computed<EntityId>(
    () => appStore.currentChannel?.id ?? 0
);
const {typingIndicatorText} = useTypingIndicator(channelIdRef);

const typingUserIds = computed(() => {
  const id = appStore.currentChannel?.id;
  return id ? appStore.typingUsers.get(id) || new Set<EntityId>() : new Set<EntityId>();
});

const isTyping = (userId: EntityId) => typingUserIds.value.has(userId);


// Permission composable használata
const {permissions, canManageMember} = usePermissions();

const messagesContainer = ref<HTMLElement | null>(null);
const isMemberListOpen = ref(true);
const messageInputRef = ref<InstanceType<typeof MessageInput> | null>(null);

// State is now derived from the store for a single source of truth
const currentChannel = computed(() => appStore.currentChannel);
const messages = computed(() => appStore.messages);
const channelDescription = computed(() => appStore.currentChannel?.description);

const members = computed(() => {
  const allMembers = appStore.members;
  const authStore = useAuthStore();
  const currentUserId = authStore.user?.id;

  // Ensure self is marked as online
  if (currentUserId && appStore.connectionState === 'connected') {
    const selfMember = allMembers.find(m => m.userId === currentUserId);
    if (selfMember) {
      selfMember.isOnline = true;
    }
  }

  return allMembers;
});

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
  const previousId = appStore.currentChannel?.id;
  if (signalRService.isConnected && previousId && previousId !== channelId) {
    await signalRService.leaveChannel(previousId);
  }

  await appStore.fetchChannel(channelId);

  if (signalRService.isConnected) {
    const typingIds = await signalRService.joinChannel(channelId);
    appStore.setTypingUsers(channelId, typingIds);
  }

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
    addToast({type: 'danger', message: 'Failed to send message.'});
  }
};

const handleEditMessage = (payload: { messageId: EntityId; content: UpdateMessageRequest }) => {
  appStore.updateMessage(currentChannel.value!.id, payload.messageId, payload.content)
      .catch(() => addToast({type: 'danger', message: 'Failed to edit message.'}));
};

const handleDeleteMessage = (messageId: EntityId) => {
  appStore.deleteMessage(currentChannel.value!.id, messageId)
      .catch(() => addToast({type: 'danger', message: 'Failed to delete message.'}));
};

const kickMember = async () => {
  addToast({type: 'info', message: 'Kick member functionality coming soon!'});
};

const banMember = async () => {
  addToast({type: 'info', message: 'Ban member functionality coming soon!'});
};

const handleGlobalDrop = (event: CustomEvent<{ files: FileList; direct: boolean }>) => {
  if (!messageInputRef.value) return;
  if (event.detail.direct) {
    messageInputRef.value.sendFilesDirect(event.detail.files);
  } else {
    messageInputRef.value.addFiles(event.detail.files);
  }
};

// --- Lifecycle & Watchers ---

onMounted(() => {
  const channelId = parseInt(route.params.channelId as string, 10);
  if (channelId) {
    loadChannelData(channelId);
  }
  window.addEventListener('global-files-dropped', handleGlobalDrop as EventListener);
});

onUnmounted(() => {
  const id = currentChannel.value?.id;
  if (id && signalRService.isConnected) {
    signalRService.leaveChannel(id);
  }
  window.removeEventListener('global-files-dropped', handleGlobalDrop as EventListener);
});

watch(() => route.params.channelId, (newId) => {
  const newChannelId = newId ? parseInt(newId as string, 10) : null;
  if (newChannelId && newChannelId !== currentChannel.value?.id) {
    loadChannelData(newChannelId);
  }
}, {immediate: true});
</script>