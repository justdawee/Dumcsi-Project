<template>
  <div class="relative flex flex-col gap-2">
    <!-- Attachments Preview -->
    <div v-if="attachments.length > 0" class="px-4 py-2">
      <div class="flex gap-2 flex-wrap">
        <div
            v-for="(attachment, index) in attachments"
            :key="index"
            class="relative group"
        >
          <!-- Upload Progress -->
          <div
              v-if="attachment.uploading"
              class="absolute inset-0 bg-black/50 flex items-center justify-center rounded z-10"
          >
            <div class="text-center">
              <Loader2 class="w-6 h-6 animate-spin text-white mx-auto mb-1"/>
              <span class="text-xs text-white">{{ attachment.progress }}%</span>
            </div>
          </div>
          <!-- Image Preview -->
          <div v-if="attachment.url">
            <img
                :alt="attachment.file.name"
                :src="attachment.url"
                class="h-20 w-auto max-w-xs rounded border border-border-subtle object-contain bg-bg-surface"
            />
            <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b truncate">
              {{ attachment.file.name }}
            </div>
          </div>
          <!-- Generic File Preview -->
          <div v-else class="flex items-center gap-2 bg-bg-surface px-3 py-2 rounded h-20 w-48">
            <File class="w-6 h-6 text-text-muted flex-shrink-0"/>
            <div class="flex flex-col min-w-0">
              <span class="text-sm text-text-secondary truncate">{{ attachment.file.name }}</span>
              <span class="text-xs text-text-tertiary">{{ formatFileSize(attachment.file.size) }}</span>
            </div>
          </div>
          <!-- Remove Button -->
          <button
              v-if="!attachment.uploading"
              class="absolute -top-1.5 -right-1.5 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-hover"
              title="Remove file"
              @click="removeAttachment(index)"
          >
            <X class="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </div>

    <!-- Mention Suggestions -->
    <div
        v-if="showMentionSuggestions && mentionSuggestions.length > 0"
        class="absolute bottom-full mb-2 left-0 right-0 bg-bg-surface border border-border-default rounded-lg shadow-lg max-h-64 overflow-hidden"
    >
      <div ref="scrollContainer" class="max-h-64 overflow-y-auto scrollbar-thin">
        <div class="p-1">
          <!-- Members Section -->
          <template v-if="userSuggestions.length > 0">
            <div class="px-3 py-1.5 text-xs font-semibold text-text-muted">Members</div>
            <button
                v-for="(suggestion, index) in userSuggestions"
                :key="`user-${suggestion.data.id}`"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  index === selectedMentionIndex
                    ? 'bg-primary/20 text-text-default'
                    : 'text-text-secondary hover:bg-primary/10 hover:text-text-default'
                ]"
                :data-selected="index === selectedMentionIndex"
                @click="selectMention(suggestion)"
                @mouseenter="handleMentionMouseEnter(index)"
            >
              <UserAvatar
                  :avatar-url="suggestion.data.avatar"
                  :size="32"
                  :user-id="suggestion.data.id"
                  :username="suggestion.data.username"
              />
              <div class="flex-1 flex items-center justify-between">
                <div class="text-sm font-medium">{{ getDisplayName(suggestion.data) }}</div>
                <div class="text-xs text-text-muted">{{ suggestion.data.username }}</div>
              </div>
            </button>
          </template>

          <!-- Separator -->
          <div v-if="userSuggestions.length > 0 && roleSuggestions.length > 0"
               class="my-1 border-t border-border-subtle mx-3"></div>

          <!-- Roles Section -->
          <template v-if="roleSuggestions.length > 0">
            <button
                v-for="(suggestion, index) in roleSuggestions"
                :key="`role-${suggestion.data.id}`"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  userSuggestions.length + index === selectedMentionIndex
                    ? 'bg-primary/20 text-text-default'
                    : 'text-text-secondary hover:bg-primary/10 hover:text-text-default'
                ]"
                :data-selected="userSuggestions.length + index === selectedMentionIndex"
                @click="selectMention(suggestion)"
                @mouseenter="handleMentionMouseEnter(userSuggestions.length + index)"
            >
              <div
                  :style="{ backgroundColor: suggestion.data.color || '#5865F2' }"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              >
                <Hash class="w-4 h-4"/>
              </div>
              <div class="flex-1 text-left">
                <div class="text-sm font-medium">@{{ suggestion.data.name }}</div>
              </div>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="flex items-center gap-2 bg-bg-surface/80 rounded-lg p-2">
      <input ref="fileInput" class="hidden" multiple type="file" @change="onFileSelected"/>

      <button
          :disabled="isUploading || attachments.length >= 10"
          class="p-2 text-text-muted hover:text-text-default disabled:opacity-50 disabled:cursor-not-allowed transition self-start"
          title="Attach files (max 10)"
          @click="fileInput?.click()"
      >
        <Paperclip class="w-5 h-5"/>
      </button>

      <div class="relative flex flex-1 items-center">
        <div
            v-if="messageContent.length > 0"
            class="absolute inset-0 pointer-events-none overflow-hidden"
        >
          <div
              :style="{
        font: 'inherit',
        fontSize: '1rem',
        lineHeight: '1.5rem',
        letterSpacing: 'normal',
        minHeight: '1.5rem',
        maxHeight: '200px',
        padding: '0',
        margin: '0',
        border: 'none'
      }"
              class="whitespace-pre-wrap break-words text-transparent"
          >
      <span v-for="(part, index) in highlightedContent" :key="index">
        <span v-if="part.type === 'text'">{{ part.content }}</span>
        <span v-else class="bg-blue-500/30 text-blue-500 rounded px-0.5">{{ part.content }}</span>
      </span>
          </div>
        </div>

        <div v-if="!messageContent" class="absolute text-text-muted pointer-events-none">
          Message #{{ props.channel.name }}
        </div>

        <textarea
            ref="messageInput"
            v-model="messageContent"
            :disabled="isSending || isUploading"
            :style="{ height: textareaHeight }"
            class="
            relative bg-transparent text-text-default resize-none
            min-h-[1.5rem] max-h-[200px] scrollbar-thin outline-none
            focus:outline-none border-none focus:border-none ring-0
            focus:ring-0 focus:ring-offset-0 focus:ring-transparent
            w-full p-0 text-base leading-6
            "
            rows="1"
            @input="handleInput"
            @keydown="handleKeyDown"
        />
      </div>

      <button
          :class="[
          'p-2 rounded-full transition self-start',
          canSend
            ? 'text-primary bg-primary/20 hover:bg-primary/30'
            : 'text-text-tertiary cursor-not-allowed'
        ]"
          :disabled="!canSend"
          title="Send Message"
          type="button"
          @click="handleSend"
      >
        <Send v-if="!isSending" class="w-5 h-5"/>
        <Loader2 v-else class="w-5 h-5 animate-spin"/>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, nextTick, onUnmounted} from 'vue';
import {useAppStore} from '@/stores/app';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {formatFileSize} from '@/utils/helpers';

// Import the new composables
import {useAttachments} from '@/composables/useAttachments';
import {useMentions} from '@/composables/useMentions';
import {useTypingIndicator} from '@/composables/useTypingIndicator';

// Component imports
import {Paperclip, Send, X, File, Loader2, Hash} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type {ChannelDetailDto, CreateMessageRequest} from '@/services/types';

// --- Props ---
const props = defineProps<{
  channel: ChannelDetailDto;
}>();

// --- Refs ---
const messageContent = ref('');
const messageInput = ref<HTMLTextAreaElement>();
const fileInput = ref<HTMLInputElement>();
const textareaHeight = ref('auto');
const isSending = ref(false);

// --- Composables Initialization ---
const appStore = useAppStore();
const {getDisplayName} = useUserDisplay();
// track the channel id reactively even when the channel object changes
const channelIdRef = computed(() => props.channel.id);

const {
  attachments,
  isUploading,
  handleFileSelect,
  removeAttachment,
  uploadAttachments,
  clearAttachments
} = useAttachments(channelIdRef);

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

const {
  sendTypingIndicator,
  stopTypingIndicator
} = useTypingIndicator(channelIdRef);


// --- Computed ---
const canSend = computed(() => {
  return (messageContent.value.trim().length > 0 || attachments.value.length > 0)
      && !isUploading.value
      && !isSending.value;
});

const userSuggestions = computed(() =>
    mentionSuggestions.value.filter(s => s.type === 'user')
);

const roleSuggestions = computed(() =>
    mentionSuggestions.value.filter(s => s.type === 'role')
);

interface HighlightPart {
  type: 'text' | 'mention';
  content: string;
}

const highlightedContent = computed(() => {
  const parts: HighlightPart[] = [];
  const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(messageContent.value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: messageContent.value.substring(lastIndex, match.index)
      });
    }

    parts.push({
      type: 'mention',
      content: match[0]
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < messageContent.value.length) {
    parts.push({
      type: 'text',
      content: messageContent.value.substring(lastIndex)
    });
  }

  return parts;
});

// --- Methods ---

const adjustTextareaHeight = () => {
  if (!messageInput.value) return;
  messageInput.value.style.height = 'auto';
  const scrollHeight = messageInput.value.scrollHeight;
  const maxHeight = 200;
  messageInput.value.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  messageInput.value.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
};

const handleInput = () => {
  adjustTextareaHeight();
  checkForMentions();
  sendTypingIndicator();
  if (messageContent.value.length === 0) {
    stopTypingIndicator();
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (handleMentionKeyDown(event)) return;
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (canSend.value) {
      handleSend();
    }
  }
};

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  handleFileSelect(target.files);
  target.value = ''; // Reset input to allow selecting the same file again
};

const handleSend = async () => {
  if (!canSend.value) return;
  isSending.value = true;

  try {
    const attachmentIds = await uploadAttachments();

    // Csak akkor küldjük az üzenetet, ha van szöveg vagy sikeres feltöltés
    if (messageContent.value.trim().length > 0 || attachmentIds.length > 0) {
      const payload: CreateMessageRequest = {
        content: messageContent.value.trim(),
        attachmentIds: attachmentIds,
        mentionedUserIds: Array.from(mentionedUserIds.value),
        mentionedRoleIds: Array.from(mentionedRoleIds.value)  // Most már küldjük a role ID-kat is
      };

      await appStore.sendMessage(props.channel.id, payload);
    }

    // Clear form state
    messageContent.value = '';
    clearAttachments();
    clearMentions();
    stopTypingIndicator();

    nextTick(() => adjustTextareaHeight());
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    isSending.value = false;
  }
};

onUnmounted(() => {
  stopTypingIndicator();
});
</script>