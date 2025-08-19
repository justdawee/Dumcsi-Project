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
          <!-- Jump to present button -->
          <button
              v-if="showJumpToPresent"
              class="absolute right-6 -top-10 z-10 bg-primary text-white text-sm font-medium px-3 py-1.5 rounded-full shadow hover:bg-primary/90 transition"
              title="Jump to latest messages"
              @click="jumpToPresent"
          >
            Jump to present
            <span v-if="pendingNewCount > 0" class="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">{{ pendingNewCount }}</span>
          </button>
          <MessageInput
              v-if="currentChannel && permissions.sendMessages"
              ref="messageInputRef"
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

      <MemberList
          v-if="isMemberListOpen"
          :is-typing="isTyping"
      />
    </div>
  </div>
  <GlobalFileDrop/>
</template>

<script lang="ts" setup>
import {ref, computed, watch, onMounted, onUnmounted, nextTick} from 'vue';
import {useRoute} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {usePermissions} from '@/composables/usePermissions';
import {debounce} from '@/utils/helpers';
import {useTypingIndicator} from '@/composables/useTypingIndicator';
import {Hash, Users, Loader2} from 'lucide-vue-next';
import MessageItem from '@/components/message/MessageItem.vue';
import MessageInput from '@/components/message/MessageInput.vue';
import MemberList from '@/components/common/MemberList.vue';
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
const {permissions} = usePermissions();

const messagesContainer = ref<HTMLElement | null>(null);
const mediaLoadedHandler = () => { if (shouldAutoFollow.value) scrollToBottomWithFocusPreserved('auto'); };
// Track whether we should auto-follow new messages (only when near bottom)
const shouldAutoFollow = ref(true);
const isMemberListOpen = ref(true);
const messageInputRef = ref<InstanceType<typeof MessageInput> | null>(null);

// State is now derived from the store for a single source of truth
const currentChannel = computed(() => appStore.currentChannel);
const messages = computed(() => appStore.messages);
const channelDescription = computed(() => appStore.currentChannel?.description);

// Jump to present state
const pendingNewCount = ref(0);
const showJumpToPresent = computed(() => !shouldAutoFollow.value && (pendingNewCount.value > 0 || lastDistanceFromBottom.value > 200));
const lastDistanceFromBottom = ref(0);


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

const scrollToBottomWithFocusPreserved = async (behavior: 'smooth' | 'auto' = 'auto') => {
  const hadFocus = !!messageInputRef.value?.isFocused?.();
  await scrollToBottom(behavior);
  if (hadFocus) {
    // restore focus after scroll
    await nextTick();
    messageInputRef.value?.focusInput?.();
  }
};

const updateAutoFollow = () => {
  const el = messagesContainer.value;
  if (!el) return;
  // distance to bottom; small threshold to treat near-bottom as bottom
  const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
  lastDistanceFromBottom.value = distance;
  shouldAutoFollow.value = distance < 120; // px threshold
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

  await scrollToBottomWithFocusPreserved();
};

// --- Event Handlers ---

const debouncedScrollHandler = debounce(() => {
  const el = messagesContainer.value;
  if (!el) return;
  // Near top: potential place to load older messages (left as TODO)
  if (el.scrollTop < 100) {
    // loadMoreMessages implementáció
  }
  // Update whether we should follow new messages
  updateAutoFollow();
  if (shouldAutoFollow.value) {
    pendingNewCount.value = 0;
  }
}, 100);

const handleSendMessage = async (payload: CreateMessageRequest) => {
  if (!currentChannel.value) return;
  try {
    await appStore.sendMessage(currentChannel.value.id, payload);
    await scrollToBottomWithFocusPreserved('smooth');
  } catch {
    addToast({type: 'danger', message: 'Failed to send message.'});
  }
};

const jumpToPresent = async () => {
  pendingNewCount.value = 0;
  await scrollToBottomWithFocusPreserved('smooth');
};

const handleEditMessage = (payload: { messageId: EntityId; content: UpdateMessageRequest }) => {
  appStore.updateMessage(currentChannel.value!.id, payload.messageId, payload.content)
      .catch(() => addToast({type: 'danger', message: 'Failed to edit message.'}));
};

const handleDeleteMessage = (messageId: EntityId) => {
  appStore.deleteMessage(currentChannel.value!.id, messageId)
      .catch(() => addToast({type: 'danger', message: 'Failed to delete message.'}));
};



const handleGlobalDrop = (event: CustomEvent<{ files: FileList; direct: boolean }>) => {
  if (!messageInputRef.value) return;
  if (event.detail.direct) {
    messageInputRef.value.sendFilesDirect(event.detail.files);
  } else {
    messageInputRef.value.addFiles(event.detail.files);
  }
};

// Keyboard shortcut handlers
const handleToggleMemberList = () => {
  isMemberListOpen.value = !isMemberListOpen.value;
};

const handleEditLastMessage = () => {
  // Find the last message by the current user that can be edited
  const currentUserId = authStore.user?.id;
  if (!currentUserId || !appStore.messages.length) return;
  
  // Find the last message sent by the current user
  const userMessages = appStore.messages
    .filter(msg => msg.author.id === currentUserId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (userMessages.length > 0) {
    const lastMessage = userMessages[0];
    
    // For now, just show a toast indicating which message would be edited
    // In a full implementation, this would trigger an inline edit mode in MessageItem
    addToast({
      type: 'info',
      message: `Would edit: "${lastMessage.content.substring(0, 50)}${lastMessage.content.length > 50 ? '...' : ''}"`,
      duration: 3000
    });
    
    console.log('🔧 Edit last message triggered for:', lastMessage.content);
  } else {
    addToast({
      type: 'warning',
      message: 'No messages to edit',
      duration: 3000
    });
  }
};

// --- Lifecycle & Watchers ---

onMounted(() => {
  const channelId = parseInt(route.params.channelId as string, 10);
  if (channelId) {
    loadChannelData(channelId);
  }
  // Initial follow state
  shouldAutoFollow.value = true;
  // Also update follow state on resize (layout changes could shift scroll)
  window.addEventListener('resize', updateAutoFollow);
  // Scroll when media (images/gifs/videos) finish loading while following
  window.addEventListener('messageMediaLoaded', mediaLoadedHandler as EventListener);
  window.addEventListener('global-files-dropped', handleGlobalDrop as EventListener);
  
  // Listen for keyboard shortcut events
  window.addEventListener('toggleMemberList', handleToggleMemberList);
  window.addEventListener('editLastMessage', handleEditLastMessage);
});

onUnmounted(() => {
  const id = currentChannel.value?.id;
  if (id && signalRService.isConnected) {
    signalRService.leaveChannel(id);
  }
  window.removeEventListener('resize', updateAutoFollow);
  window.removeEventListener('global-files-dropped', handleGlobalDrop as EventListener);
  
  // Remove keyboard shortcut event listeners
  window.removeEventListener('toggleMemberList', handleToggleMemberList);
  window.removeEventListener('editLastMessage', handleEditLastMessage);
  window.removeEventListener('messageMediaLoaded', mediaLoadedHandler as EventListener);
});

watch(() => route.params.channelId, (newId) => {
  const newChannelId = newId ? parseInt(newId as string, 10) : null;
  if (newChannelId && newChannelId !== currentChannel.value?.id) {
    loadChannelData(newChannelId);
  }
}, {immediate: true});

// Auto-follow incoming messages only when near the bottom
watch(
  () => appStore.messages.length,
  async (newLen, oldLen) => {
    if (newLen > oldLen && shouldAutoFollow.value) {
      await scrollToBottomWithFocusPreserved('smooth');
      // Schedule a couple of follow-up scrolls to account for images/gifs sizing in
      setTimeout(() => { if (shouldAutoFollow.value) scrollToBottomWithFocusPreserved('auto'); }, 80);
      setTimeout(() => { if (shouldAutoFollow.value) scrollToBottomWithFocusPreserved('auto'); }, 220);
    } else if (newLen > oldLen && !shouldAutoFollow.value) {
      pendingNewCount.value += (newLen - oldLen);
    }
  }
);
</script>
