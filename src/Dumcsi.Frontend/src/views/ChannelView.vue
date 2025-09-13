<template>
  <div class="flex flex-col h-screen bg-main-900">
    <div class="flex items-center justify-between px-4 h-14 bg-main-900 border-b border-main-700 flex-shrink-0">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <Hash class="w-5 h-5 text-text-muted flex-shrink-0"/>
        <h2 class="text-lg font-semibold text-text-default truncate">{{ currentChannel?.name || t('channels.sidebar.loading') }}</h2>
        <span v-if="channelDescription" class="text-sm text-text-muted hidden md:inline truncate">{{
            channelDescription
          }}</span>
      </div>
      
      <div class="flex items-center gap-2">
        <button
            class="p-2 text-text-muted hover:text-text-default transition"
            :title="t('chat.memberList.toggleTitle')"
            @click="isMemberListOpen = !isMemberListOpen"
        >
          <Users class="w-5 h-5"/>
        </button>
        
        <!-- Search Field - Always visible input -->
        <div class="relative">
          <input
              ref="searchInputRef"
              v-model="searchQuery"
              class="bg-bg-surface text-text-default px-3 py-2 pr-8 rounded-lg w-32 focus:w-80 text-sm border border-border-default focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 ease-in-out"
              :placeholder="t('chat.search.placeholder')"
              @keydown.enter.prevent="executeSearch"
              @keydown.tab.prevent="selectAutocomplete"
              @keydown.escape="showAutocomplete = false"
              @keydown.arrow-down.prevent="navigateAutocomplete(1)"
              @keydown.arrow-up.prevent="navigateAutocomplete(-1)"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
              @input="onSearchInput"
          />
          <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button 
              v-if="searchQuery.length > 0"
              @click="clearSearch"
              class="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-default transition-colors"
              :title="t('chat.search.clear')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <button 
              @click="executeSearch"
              class="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-default transition-colors"
              :title="t('chat.search.searchEnter')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          </div>
          
          <!-- Autocomplete Dropdown -->
          <div 
            v-if="showAutocomplete && autocompleteOptions.length > 0"
            class="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-border-default rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
          >
            <div class="p-2 text-xs text-text-muted border-b border-border-default">
              Search suggestions (Tab to select, ↑↓ to navigate)
            </div>
            <div
              v-for="(option, index) in autocompleteOptions"
              :key="option"
              :class="[
                'px-3 py-2 text-sm cursor-pointer transition-colors',
                index === selectedAutocompleteIndex 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-text-default hover:bg-bg-hover'
              ]"
              @click="applyAutocomplete(option)"
            >
              {{ option }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <div class="flex-1 flex flex-col">
        <!-- Search Results Mode -->
        <div v-if="isSearching" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-text-muted text-sm">{{ t('chat.search.resultsCount', { count: searchResults.length }) }}</div>
            <button class="text-sm text-text-muted hover:text-text-default" @click="exitSearch">{{ t('chat.search.exit') }}</button>
          </div>
          <div v-if="searchLoading" class="flex justify-center p-4">
            <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
          </div>
          <div v-else-if="searchResults.length === 0" class="text-text-muted">{{ t('chat.search.noResults') }}</div>
          <div v-else>
            <div 
              v-for="(message, index) in searchResults"
              :key="`search-${message.id}`"
              class="cursor-pointer hover:bg-bg-hover/30 rounded-lg p-2 transition-colors"
              @click="jumpToMessage(message)"
            >
              <UniversalMessageItem
                  :current-user-id="authStore.user?.id"
                  :message="message"
                  :previous-message="searchResults[index - 1] || null"
                  @delete="handleDeleteMessage"
                  @edit="handleEditMessage"
              />
              <div class="text-xs text-text-muted mt-1 flex items-center gap-2">
                <span>#{{ getChannelName(message.channelId) }}</span>
                <span>•</span>
                <span>{{ formatMessageDate(message.timestamp) }}</span>
                <span class="text-primary">{{ t('chat.search.clickToJump') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
            v-else
            ref="messagesContainer"
            class="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
            @scroll="debouncedScrollHandler"
        >
          <div v-if="appStore.loading.messages" class="flex justify-center p-4">
            <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
          </div>
          <div v-else-if="appStore.messages.length === 0" class="text-center text-text-muted">
            <p>{{ t('chat.empty.noMessagesInChannel') }}</p>
            <p class="text-sm">{{ t('chat.empty.firstMessage') }}</p>
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
              :title="t('chat.jump.title')"
          @click="jumpToPresent"
         >
            {{ t('chat.jump.button') }}
            <span v-if="pendingNewCount > 0" class="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">{{ pendingNewCount }}</span>
          </button>
          <UniversalMessageInput
              v-if="currentChannel && permissions.sendMessages"
              ref="messageInputRef"
              :channel-id="currentChannel.id"
              :placeholder="t('chat.input.messageChannel', { channel: currentChannel.name })"
              @send="handleSendMessage"
          />
          <div v-else-if="!permissions.sendMessages" class="text-center text-text-muted text-sm py-2">
            {{ t('chat.permissions.cannotSend') }}
          </div>
          <Transition name="typing-fade">
            <div
                v-if="chatSettings.showTypingIndicators && typingIndicatorText"
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
import {useRoute, useRouter} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {usePermissions} from '@/composables/usePermissions';
import {debounce} from '@/utils/helpers';
import {useTypingIndicator} from '@/composables/useTypingIndicator';
import {Hash, Users, Loader2} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useChatSettings } from '@/composables/useChatSettings';
const { t } = useI18n();
const { chatSettings } = useChatSettings();
import UniversalMessageItem from '@/components/chat/UniversalMessageItem.vue';
import UniversalMessageInput from '@/components/chat/UniversalMessageInput.vue';
import MemberList from '@/components/common/MemberList.vue';
import GlobalFileDrop from '@/components/ui/GlobalFileDrop.vue';
import {signalRService} from '@/services/signalrService';
import messageService from '@/services/messageService';
import {
  type CreateMessageRequest,
  type UpdateMessageRequest,
  type EntityId,
} from '@/services/types';

const route = useRoute();
const router = useRouter();
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
const messageInputRef = ref<InstanceType<typeof UniversalMessageInput> | null>(null);

// State is now derived from the store for a single source of truth
const currentChannel = computed(() => appStore.currentChannel);
const messages = computed(() => appStore.messages);
const channelDescription = computed(() => appStore.currentChannel?.description);

// Jump to present state
const pendingNewCount = ref(0);
const showJumpToPresent = computed(() => !shouldAutoFollow.value && (pendingNewCount.value > 0 || lastDistanceFromBottom.value > 200));
const lastDistanceFromBottom = ref(0);

// Search state
const isSearchOpen = ref(false);
const isSearching = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchLoading = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const showAutocomplete = ref(false);
const autocompleteOptions = ref<string[]>([]);
const selectedAutocompleteIndex = ref(-1);


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
    addToast({type: 'danger', message: t('chat.toasts.sendFailed')});
  }
};

const jumpToPresent = async () => {
  pendingNewCount.value = 0;
  await scrollToBottomWithFocusPreserved('smooth');
};

const handleEditMessage = (payload: { messageId: EntityId; content: UpdateMessageRequest }) => {
  appStore.updateMessage(currentChannel.value!.id, payload.messageId, payload.content)
      .catch(() => addToast({type: 'danger', message: t('chat.toasts.editFailed')}));
};

const handleDeleteMessage = (messageId: EntityId) => {
  appStore.deleteMessage(currentChannel.value!.id, messageId)
      .catch(() => addToast({type: 'danger', message: t('chat.toasts.deleteFailed')}));
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
      message: t('chat.toasts.noMessagesToEdit'),
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

  // Focus search on Ctrl+F
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      searchInputRef.value?.focus();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  (onMounted as any)._onKeyDown = onKeyDown;
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
  try { window.removeEventListener('keydown', (onMounted as any)._onKeyDown as EventListener); } catch {}
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

// --- Search Helpers ---

const clearSearch = () => {
  searchQuery.value = '';
  isSearching.value = false;
  searchResults.value = [];
  showAutocomplete.value = false;
  nextTick(() => searchInputRef.value?.focus());
};

const exitSearch = () => {
  isSearching.value = false;
  isSearchOpen.value = false;
  searchResults.value = [];
  showAutocomplete.value = false;
};

// New search handlers
const onSearchFocus = () => {
  if (searchQuery.value.trim()) {
    updateAutocomplete();
  }
};

const onSearchBlur = () => {
  // Delay hiding autocomplete to allow for clicks
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
};

const onSearchInput = () => {
  updateAutocomplete();
  if (searchQuery.value.trim() === '') {
    isSearching.value = false;
    searchResults.value = [];
  }
};

// Autocomplete functionality
const updateAutocomplete = () => {
  const query = searchQuery.value;
  const cursorPos = searchInputRef.value?.selectionStart || 0;
  const beforeCursor = query.slice(0, cursorPos);
  const lastWord = beforeCursor.split(' ').pop() || '';
  
  const options: string[] = [];
  
  if (lastWord.startsWith('from:')) {
    const partial = lastWord.slice(5).toLowerCase();
    const matchingMembers = appStore.members
      .filter(m => 
        m.username.toLowerCase().includes(partial) || 
        (m.globalNickname && m.globalNickname.toLowerCase().includes(partial))
      )
      .slice(0, 5)
      .map(m => `from:${m.username}`);
    options.push(...matchingMembers);
  } else if (lastWord.startsWith('in:')) {
    const partial = lastWord.slice(3).toLowerCase();
    const matchingChannels = appStore.currentServer?.channels
      ?.filter(c => c.name.toLowerCase().includes(partial))
      .slice(0, 5)
      .map(c => `in:#${c.name}`) || [];
    options.push(...matchingChannels);
  } else if (lastWord.startsWith('has:')) {
    const hasOptions = ['has:link', 'has:embed', 'has:file'];
    const partial = lastWord.slice(4).toLowerCase();
    options.push(...hasOptions.filter(opt => opt.includes(partial)));
  } else if (lastWord === '' || (!lastWord.includes(':') && lastWord.length < 3)) {
    // Show available tags for empty or short input
    const tags = ['from:', 'in:', 'has:', 'before:', 'after:'];
    options.push(...tags);
  }
  
  autocompleteOptions.value = options;
  showAutocomplete.value = options.length > 0;
  selectedAutocompleteIndex.value = -1;
};

// Jump to message functionality
const jumpToMessage = async (message: any) => {
  if (message.channelId !== currentChannel.value?.id) {
    // Navigate to the channel first
    await router.push(`/servers/${appStore.currentServer?.id}/channels/${message.channelId}`);
    await nextTick();
  }
  
  // Exit search mode
  exitSearch();
  
  // Scroll to the message (simplified implementation)
  const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
  if (messageElement) {
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Highlight the message briefly
    messageElement.classList.add('bg-primary/20');
    setTimeout(() => {
      messageElement.classList.remove('bg-primary/20');
    }, 3000);
  } else {
    // If message not visible, show a toast
    addToast({
      type: 'info',
      message: `Jumped to message in #${getChannelName(message.channelId)}`,
      duration: 3000
    });
  }
};

// Helper functions
const getChannelName = (channelId: number): string => {
  const channel = appStore.currentServer?.channels?.find(c => c.id === channelId);
  return channel?.name || 'unknown';
};

const formatMessageDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Autocomplete navigation and selection
const navigateAutocomplete = (direction: number) => {
  if (!showAutocomplete.value || autocompleteOptions.value.length === 0) return;
  
  const newIndex = selectedAutocompleteIndex.value + direction;
  if (newIndex >= 0 && newIndex < autocompleteOptions.value.length) {
    selectedAutocompleteIndex.value = newIndex;
  } else if (direction > 0) {
    selectedAutocompleteIndex.value = 0; // Wrap to first
  } else {
    selectedAutocompleteIndex.value = autocompleteOptions.value.length - 1; // Wrap to last
  }
};

const selectAutocomplete = () => {
  if (selectedAutocompleteIndex.value >= 0 && selectedAutocompleteIndex.value < autocompleteOptions.value.length) {
    applyAutocomplete(autocompleteOptions.value[selectedAutocompleteIndex.value]);
  }
};

const applyAutocomplete = (option: string) => {
  const query = searchQuery.value;
  const cursorPos = searchInputRef.value?.selectionStart || 0;
  const beforeCursor = query.slice(0, cursorPos);
  const afterCursor = query.slice(cursorPos);
  
  // Find the last word that starts with the autocomplete prefix
  const words = beforeCursor.split(' ');
  const lastWordIndex = words.length - 1;
  
  // Replace the last word with the selected option
  words[lastWordIndex] = option;
  
  const newQuery = words.join(' ') + ' ' + afterCursor;
  searchQuery.value = newQuery.trim();
  
  showAutocomplete.value = false;
  selectedAutocompleteIndex.value = -1;
  
  // Set cursor position after the inserted text
  nextTick(() => {
    const newCursorPos = words.join(' ').length + 1;
    searchInputRef.value?.setSelectionRange(newCursorPos, newCursorPos);
    searchInputRef.value?.focus();
  });
};

interface ParsedSearch {
  serverId?: number;
  channelId?: number;
  authorId?: number;
  q?: string;
  has?: string;
  before?: string;
  after?: string;
}

const parseSearchQuery = (): ParsedSearch => {
  const text = searchQuery.value.trim();
  const tokens = text.split(/\s+/);
  const parsed: ParsedSearch = {};
  const freeText: string[] = [];

  const server = appStore.currentServer;
  if (server?.id) parsed.serverId = server.id;

  tokens.forEach(t => {
    const m = t.match(/^(in|from|has|before|after):(.+)$/i);
    if (!m) { freeText.push(t); return; }
    const key = m[1].toLowerCase();
    let val = m[2];
    switch (key) {
      case 'in': {
        // formats: #channel-name or channel-name
        val = val.replace(/^#/, '');
        const ch = server?.channels?.find(c => c.name.toLowerCase() === val.toLowerCase());
        if (ch) parsed.channelId = ch.id;
        break;
      }
      case 'from': {
        // match @username or username
        val = val.replace(/^@/, '');
        const member = appStore.members.find(mb => mb.username.toLowerCase() === val.toLowerCase() || mb.globalNickname?.toLowerCase() === val.toLowerCase());
        if (member) parsed.authorId = member.userId;
        break;
      }
      case 'has': {
        const v = val.toLowerCase();
        if (/(link|embed|file)/.test(v)) parsed.has = v;
        break;
      }
      case 'before': {
        parsed.before = val; // send to backend as-is; backend parses
        break;
      }
      case 'after': {
        parsed.after = val;
        break;
      }
    }
  });

  const q = freeText.join(' ').trim();
  if (q) parsed.q = q;
  return parsed;
};

const executeSearch = async () => {
  const filters = parseSearchQuery();
  // default to current channel if none specified
  if (!filters.channelId && currentChannel.value?.id) {
    filters.channelId = currentChannel.value.id;
  }

  searchLoading.value = true;
  isSearching.value = true;
  try {
    const results = await messageService.searchMessages(filters);
    searchResults.value = results;
  } catch (e) {
    addToast({ type: 'danger', message: t('chat.toasts.searchFailed') });
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
};
</script>
