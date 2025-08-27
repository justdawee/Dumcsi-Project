<template>
  <div
      class="relative"
      :class="{ 'ring-2 ring-primary/50': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
  >
    <!-- Attachment Preview -->
    <div v-if="attachments.length > 0" class="p-2 bg-bg-main border-b border-bg-surface">
      <div class="flex flex-wrap gap-2">
        <div
            v-for="(attachment, index) in attachments"
            :key="index"
            class="relative group bg-bg-surface rounded-lg p-2 pr-8 flex items-center gap-2"
        >
          <FileIcon class="w-4 h-4 text-text-muted" />
          <div class="text-sm">
            <div class="text-text-default">{{ attachment.file.name }}</div>
            <div class="text-xs text-text-tertiary">{{ formatFileSize(attachment.file.size) }}</div>
          </div>
          <button
              class="absolute right-1 top-1 p-1 text-text-muted hover:text-danger rounded transition-colors opacity-0 group-hover:opacity-100"
              @click="removeAttachment(index)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mention Suggestions Dropdown -->
    <div
        v-if="showMentionSuggestions"
        ref="scrollContainer"
        class="absolute bottom-full mb-2 left-0 right-0 bg-bg-surface rounded-lg shadow-xl border border-bg-light max-h-64 overflow-y-auto z-50"
    >
      <div class="p-2">
        <div v-if="userSuggestions.length > 0" class="mb-2">
          <div class="text-xs text-text-tertiary uppercase px-2 mb-1">Users</div>
          <button
              v-for="(suggestion, index) in userSuggestions"
              :key="`user-${index}`"
              class="w-full flex items-center gap-3 p-2 rounded hover:bg-primary/10 transition-colors text-left"
              :class="index === selectedMentionIndex ? 'bg-primary/20 text-text-default' : 'text-text-secondary'"
              @click="selectMention(suggestion)"
              @mouseenter="handleMentionMouseEnter(index)"
          >
            <UserAvatar
                :username="suggestion.data.username"
                :avatar-url="suggestion.data.avatar"
                :size="32"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ getDisplayName(suggestion.data) }}
              </div>
              <div class="text-xs text-text-tertiary truncate">
                @{{ suggestion.data.username }}
              </div>
            </div>
          </button>
        </div>

        <div v-if="roleSuggestions.length > 0">
          <div class="text-xs text-text-tertiary uppercase px-2 mb-1">Roles</div>
          <button
              v-for="(suggestion, index) in roleSuggestions"
              :key="`role-${index}`"
              class="w-full flex items-center gap-3 p-2 rounded hover:bg-primary/10 transition-colors text-left"
              :class="userSuggestions.length + index === selectedMentionIndex ? 'bg-primary/20 text-text-default' : 'text-text-secondary'"
              @click="selectMention(suggestion)"
              @mouseenter="handleMentionMouseEnter(userSuggestions.length + index)"
          >
            <div
                :style="{ backgroundColor: suggestion.data.color || '#5865F2' }"
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            >
              <Hash class="w-4 h-4" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-medium">@{{ suggestion.data.name }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Markdown Toolbar -->
    <MarkdownToolbar
        v-if="showToolbar"
        :show-preview="showPreview"
        @toggle-preview="showPreview = !showPreview"
        @format="handleFormat"
        @insert="handleInsert"
    />

    <!-- Input Area -->
    <div class="flex items-center gap-2 bg-bg-surface/80 rounded-lg p-2">
    <input
          ref="fileInput"
          class="hidden"
          multiple
          type="file"
          @change="onFileSelected"
      />

      <button
          :disabled="isUploading || attachments.length >= 10"
          class="p-2 text-text-muted hover:text-text-default disabled:opacity-50 disabled:cursor-not-allowed transition self-start"
          title="Attach files (max 10)"
          @click="fileInput?.click()"
      >
        <Paperclip class="w-5 h-5" />
      </button>

      <div class="flex-1">
        <!-- Preview Mode -->
        <div v-if="showPreview" class="min-h-[40px] max-h-[224px] overflow-y-auto p-2.5">
          <MessageContentParser
              v-if="messageContent"
              :content="messageContent"
              :mentioned-user-ids="Array.from(mentionedUserIds)"
              :mentioned-role-ids="Array.from(mentionedRoleIds)"
          />
          <div v-else class="text-text-muted italic">
            Nothing to preview
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="relative">
          <div v-if="!messageContent" class="absolute text-text-muted pointer-events-none top-1.5 left-2.5">
            {{ placeholder }}
          </div>

          <textarea
              ref="messageInput"
              v-model="messageContent"
              :disabled="isSending || isUploading"
              class="w-full bg-transparent text-text-default resize-none p-2
                   scrollbar-thin outline-none focus:outline-none border-none focus:border-none
                   ring-0 focus:ring-0 leading-4"
              rows="1"
              @input="handleInput"
              @keydown="handleKeyDown"
          />
        </div>
      </div>

      <button
          ref="gifPickerButton"
          class="p-2 text-text-muted hover:text-text-default transition self-start"
          title="Open GIF picker"
          @click="showGifPicker = !showGifPicker"
      >
        <ImageIcon class="w-5 h-5" />
      </button>

      <button
          :class="[
          'p-2 rounded-full transition self-start',
          canSend
            ? 'text-primary bg-primary/20 hover:bg-primary/30'
            : 'text-text-tertiary cursor-not-allowed'
        ]"
          :disabled="!canSend"
          title="Send Message"
          @click="handleSend"
      >
        <Send v-if="!isSending" class="w-5 h-5" />
        <Loader2 v-else class="w-5 h-5 animate-spin" />
      </button>
      <GifPicker
          v-model="showGifPicker"
          :toggle-button="gifPickerButton"
          @select="handleGifSelect"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { formatFileSize } from '@/utils/helpers';
import { MarkdownParser } from '@/services/markdownParser';

// Import composables - we'll need to make these context-agnostic
import { useAttachments } from '@/composables/useAttachments';
import { useMentions } from '@/composables/useMentions';
import { useTypingIndicator } from '@/composables/useTypingIndicator';
import { useDmTypingIndicator } from '@/composables/useDmTypingIndicator';

// Component imports
import { Paperclip, Send, X, File as FileIcon, Loader2, Hash } from 'lucide-vue-next';
import { ImagePlay as ImageIcon } from "lucide-vue-next";

import GifPicker from '../message/GifPicker.vue';
import UserAvatar from '../common/UserAvatar.vue';
import MessageContentParser from '../message/MessageContentParser.vue';
import MarkdownToolbar from '../message/MarkdownToolbar.vue';
import type { CreateMessageRequest, SendDmMessageRequest, EntityId } from '@/services/types';

// Props
const props = defineProps<{
  placeholder?: string;
  channelId?: EntityId;  // For server messages
  isDm?: boolean;       // Flag to indicate DM context
  dmUserId?: EntityId;  // For DMs: the other user's ID
}>();

const emit = defineEmits<{
  (e: 'send', payload: CreateMessageRequest | SendDmMessageRequest): void;
}>();

// Refs
const messageContent = ref('');
const messageInput = ref<HTMLTextAreaElement>();
const fileInput = ref<HTMLInputElement>();
const isSending = ref(false);
const showPreview = ref(false);
const showToolbar = ref(false);
const isDragOver = ref(false);
const MAX_TEXTAREA_HEIGHT = 330;
const showGifPicker = ref(false);
const gifPickerButton = ref<HTMLElement | null>(null);

// Composables
const { getDisplayName } = useUserDisplay();
const channelIdRef = computed(() => props.channelId || 0);
const dmUserIdRef = computed(() => props.dmUserId || 0);

const isDmRef = computed(() => !!props.isDm);
const {
  attachments,
  isUploading,
  handleFileSelect,
  removeAttachment,
  uploadAttachments,
  clearAttachments
} = useAttachments(props.isDm ? null : channelIdRef, dmUserIdRef, isDmRef);

const {
  showMentionSuggestions,
  mentionSuggestions,
  selectedMentionIndex,
  mentionedUserIds,
  mentionedRoleIds,
  checkForMentions,
  selectMention,
  handleMentionKeyDown,
  handleMentionMouseEnter,
  clearMentions,
  scrollContainer
} = useMentions(messageContent, messageInput);

// Typing indicators
const typing = props.isDm ? null : useTypingIndicator(channelIdRef);
const dmTyping = props.isDm ? useDmTypingIndicator(dmUserIdRef) : null;

// Computed
const canSend = computed(() => {
  return (messageContent.value.trim().length > 0 || attachments.value.length > 0)
      && !isUploading.value
      && !isSending.value;
});

const userSuggestions = computed(() =>
    mentionSuggestions.value.filter(s => s.type === 'user')
);

const roleSuggestions = computed(() => {
  // Only show role suggestions for server messages, not DMs
  return props.isDm ? [] : mentionSuggestions.value.filter(s => s.type === 'role');
});

// Watch for content changes to show/hide toolbar
watch(messageContent, (newVal) => {
  showToolbar.value = newVal.length > 0;
});

// Methods
const adjustTextareaHeight = () => {
  const el = messageInput.value;
  if (!el) return;

  // Reset height to calculate the new scrollHeight correctly
  el.style.height = 'auto';
  const scrollHeight = el.scrollHeight;

  // If scrollHeight exceeds max height, fix height and enable scrollbar
  if (scrollHeight > MAX_TEXTAREA_HEIGHT) {
    el.style.height = `${MAX_TEXTAREA_HEIGHT}px`;
    el.style.overflowY = 'auto';
  } else {
    // Otherwise, set height to content height and hide scrollbar
    el.style.height = `${scrollHeight}px`;
    el.style.overflowY = 'hidden';
  }
};

const handleInput = () => {
  adjustTextareaHeight();
  checkForMentions();
  if (!props.isDm && props.channelId) {
    typing?.sendTypingIndicator();
    if (messageContent.value.length === 0) {
      typing?.stopTypingIndicator();
    }
  } else if (props.isDm && props.dmUserId) {
    dmTyping?.sendTypingIndicator();
    if (messageContent.value.length === 0) {
      dmTyping?.stopTypingIndicator();
    }
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (handleMentionKeyDown(event)) return;

  // Markdown shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'b':
        event.preventDefault();
        handleFormat('bold', '**', '**');
        break;
      case 'i':
        event.preventDefault();
        handleFormat('italic', '*', '*');
        break;
      case 'k':
        event.preventDefault();
        const url = prompt('Enter URL:');
        if (url) {
          handleFormat('link', '[', `](${url})`);
        }
        break;
    }
  }

  // Send on Enter (without Shift)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (canSend.value) {
      handleSend();
    }
  }
};

const handleFormat = (_format: string, prefix: string, suffix?: string) => {
  if (!messageInput.value) return;

  const start = messageInput.value.selectionStart;
  const end = messageInput.value.selectionEnd;
  const selectedText = messageContent.value.substring(start, end);

  const before = messageContent.value.substring(0, start);
  const after = messageContent.value.substring(end);

  if (suffix) {
    messageContent.value = before + prefix + selectedText + suffix + after;
    nextTick(() => {
      if (messageInput.value) {
        messageInput.value.selectionStart = start + prefix.length;
        messageInput.value.selectionEnd = start + prefix.length + selectedText.length;
        messageInput.value.focus();
      }
    });
  } else {
    messageContent.value = before + prefix + selectedText + after;
    nextTick(() => {
      if (messageInput.value) {
        messageInput.value.selectionStart = start + prefix.length;
        messageInput.value.selectionEnd = start + prefix.length + selectedText.length;
        messageInput.value.focus();
      }
    });
  }
};

const handleInsert = (text: string) => {
  if (!messageInput.value) return;

  const start = messageInput.value.selectionStart;
  const before = messageContent.value.substring(0, start);
  const after = messageContent.value.substring(start);

  messageContent.value = before + text + after;
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.selectionStart = start + text.length;
      messageInput.value.selectionEnd = start + text.length;
      messageInput.value.focus();
    }
  });
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  if (event.currentTarget === event.target) {
    isDragOver.value = false;
  }
};

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false;
  handleFileSelect(event.dataTransfer?.files ?? null);
};

const sendFilesDirect = async (files: FileList) => {
  await handleFileSelect(files);
  await handleSend();
};

const handleGifSelect = async (gifUrl: string) => {
  if (isSending.value) return;

  showGifPicker.value = false;
  isSending.value = true;
  try {
    if (props.isDm) {
      const payload: SendDmMessageRequest = {
        content: gifUrl,
      };
      emit('send', payload);
    } else {
      const payload: CreateMessageRequest = {
        content: gifUrl,
      };
      emit('send', payload);
    }
  } catch (error) {
    console.error('Failed to send GIF message:', error);
  } finally {
    isSending.value = false;
  }
};

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  handleFileSelect(target.files);
  target.value = '';
};

const handleSend = async () => {
  if (!canSend.value) return;
  isSending.value = true;

  try {
    const attachmentIds = await uploadAttachments();
    const mentions = MarkdownParser.extractMentions(messageContent.value);

    if (messageContent.value.trim().length > 0 || attachmentIds.length > 0) {
      if (props.isDm) {
        const payload: SendDmMessageRequest = {
          content: messageContent.value.trim(),
          attachmentIds: attachmentIds,
          mentionedUserIds: [...Array.from(mentionedUserIds.value), ...mentions.userIds]
        };
        emit('send', payload);
      } else {
        const payload: CreateMessageRequest = {
          content: messageContent.value.trim(),
          attachmentIds: attachmentIds,
          mentionedUserIds: [...Array.from(mentionedUserIds.value), ...mentions.userIds],
          mentionedRoleIds: [...Array.from(mentionedRoleIds.value), ...mentions.roleIds]
        };
        emit('send', payload);
      }
    }

    messageContent.value = '';
    clearAttachments();
    clearMentions();
    if (!props.isDm && props.channelId) {
      typing?.stopTypingIndicator();
    } else if (props.isDm && props.dmUserId) {
      dmTyping?.stopTypingIndicator();
    }
    showPreview.value = false;
    showToolbar.value = false;

    await nextTick(() => {
      if (messageInput.value) {
        messageInput.value.style.height = 'auto';
        messageInput.value.style.overflowY = 'hidden';
      }
    });
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    isSending.value = false;
  }
};

onMounted(() => {
  // Focus on input when mounted
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.focus();
    }
  });
});

onUnmounted(() => {
  if (!props.isDm && props.channelId) {
    typing?.stopTypingIndicator();
  } else if (props.isDm && props.dmUserId) {
    dmTyping?.stopTypingIndicator();
  }
});

defineExpose({
  addFiles: handleFileSelect,
  sendFilesDirect,
  focusInput: () => messageInput.value?.focus(),
  isFocused: () => document.activeElement === messageInput.value,
});
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--color-text-muted) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--color-text-muted);
  border-radius: 3px;
}
</style>
