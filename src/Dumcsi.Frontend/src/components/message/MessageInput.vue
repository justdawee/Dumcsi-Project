<template>
  <div class="relative px-4 pb-4">
    <!-- Mention suggestions dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-if="showMentionSuggestions" 
        class="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto border border-gray-700"
      >
        <div class="p-2 text-xs text-gray-400 uppercase tracking-wide">
          Matching Members
        </div>
        <div
          v-for="(user, index) in mentionSuggestions"
          :key="user.id"
          @click="selectMention(user)"
          :class="[
            'px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-3 transition-colors',
            selectedMentionIndex === index && 'bg-gray-700'
          ]"
        >
          <img 
            :src="getAvatarUrl(user)" 
            :alt="getDisplayName(user)"
            class="w-8 h-8 rounded-full"
          >
          <div class="flex-1 min-w-0">
            <div class="font-medium text-white truncate">
              {{ user.globalNickname || user.username }}
            </div>
            <div class="text-sm text-gray-400 truncate">
              @{{ user.username }}
            </div>
          </div>
          <div 
            v-if="user.isOnline" 
            class="w-2 h-2 bg-green-500 rounded-full"
            title="Online"
          />
        </div>
        <div v-if="mentionSuggestions.length === 0 && currentMentionSearch.length > 0" class="px-3 py-4 text-center text-gray-400">
          No members found matching "{{ currentMentionSearch }}"
        </div>
      </div>
    </Transition>

    <!-- Attachment preview -->
    <div v-if="attachments.length > 0" class="mb-2 flex flex-wrap gap-2">
      <div
        v-for="(attachment, index) in attachments"
        :key="index"
        class="relative group bg-gray-700 rounded-lg p-2 flex items-center gap-2"
      >
        <File class="w-4 h-4 text-gray-400" />
        <span class="text-sm text-gray-300 max-w-[200px] truncate">
          {{ attachment.file.name }}
        </span>
        <span class="text-xs text-gray-500">
          {{ formatFileSize(attachment.file.size) }}
        </span>
        <button
          @click="removeAttachment(index)"
          class="ml-1 p-1 rounded hover:bg-gray-600 transition-colors"
          type="button"
        >
          <X class="w-3 h-3" />
        </button>
        <!-- Upload progress -->
        <div
          v-if="attachment.uploading"
          class="absolute bottom-0 left-0 right-0 h-1 bg-gray-600 rounded-b-lg overflow-hidden"
        >
          <div
            class="h-full bg-primary transition-all duration-300"
            :style="{ width: `${attachment.progress}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Input container -->
    <div class="bg-gray-700 rounded-lg flex items-end">
      <!-- File attachment button -->
      <button
        @click="fileInput?.click()"
        class="p-3 text-gray-400 hover:text-gray-200 transition-colors"
        type="button"
        :disabled="isUploading"
      >
        <Paperclip class="w-5 h-5" />
      </button>
      
      <input
        ref="fileInput"
        type="file"
        multiple
        @change="handleFileSelect"
        class="hidden"
        accept="image/*,video/*,audio/*,.pdf,.txt,.zip,.rar"
      />

      <!-- Message input -->
      <div class="flex-1 relative">
        <textarea
          ref="messageInput"
          v-model="messageContent"
          @input="handleInput"
          @keydown="handleKeyDown"
          @paste="handlePaste"
          :placeholder="`Message #${channel?.name || 'channel'}`"
          :disabled="isSending || isUploading"
          class="w-full px-3 py-3 bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none"
          rows="1"
          :style="{ height: textareaHeight }"
        />
      </div>

      <!-- Emoji picker button -->
      <button
        @click="toggleEmojiPicker"
        class="p-3 text-gray-400 hover:text-gray-200 transition-colors"
        type="button"
      >
        <Smile class="w-5 h-5" />
      </button>

      <!-- Send button -->
      <button
        @click="sendMessage"
        :disabled="!canSend || isSending || isUploading"
        :class="[
          'p-3 transition-colors',
          canSend && !isSending && !isUploading
            ? 'text-primary hover:text-primary-hover'
            : 'text-gray-500 cursor-not-allowed'
        ]"
        type="button"
      >
        <Send class="w-5 h-5" />
      </button>
    </div>

    <!-- Character counter -->
    <div 
      v-if="messageContent.length > 1800" 
      class="mt-1 text-xs text-right"
      :class="messageContent.length > 2000 ? 'text-danger' : 'text-gray-400'"
    >
      {{ messageContent.length }} / 2000
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { useToast } from '@/composables/useToast';
import userService from '@/services/userService';
import uploadService from '@/services/uploadService';
import { signalRService } from '@/services/signalrService';
import { Paperclip, Smile, Send, X, File } from 'lucide-vue-next';
import { debounce } from 'lodash';
import type { UserSearchResult, ChannelDetail, CreateMessagePayload } from '@/services/types';

// Props
const props = defineProps<{
  channel: ChannelDetail;
}>();

// Composables
const appStore = useAppStore();
const { getDisplayName, getAvatarUrl } = useUserDisplay();
const { addToast } = useToast();

// State
const messageContent = ref('');
const messageInput = ref<HTMLTextAreaElement>();
const fileInput = ref<HTMLInputElement>();
const textareaHeight = ref('auto');
const isSending = ref(false);
const isUploading = ref(false);
const showEmojiPicker = ref(false);

// Mention state
const showMentionSuggestions = ref(false);
const mentionSuggestions = ref<UserSearchResult[]>([]);
const currentMentionSearch = ref('');
const selectedMentionIndex = ref(0);
const mentionedUserIds = ref<Set<number>>(new Set());
const mentionedRoleIds = ref<Set<number>>(new Set());
const mentionPosition = ref(0);

// Attachment state
interface Attachment {
  file: File;
  url?: string;
  uploading: boolean;
  progress: number;
  error?: string;
}
const attachments = ref<Attachment[]>([]);

// Computed
const canSend = computed(() => {
  return (messageContent.value.trim().length > 0 || attachments.value.length > 0) 
    && messageContent.value.length <= 2000;
});

// Debounced search function
const searchUsers = debounce(async (query: string) => {
  if (query.length < 1) {
    mentionSuggestions.value = [];
    return;
  }
  
  try {
    const response = await userService.searchUsers(query);
    mentionSuggestions.value = response.data;
    selectedMentionIndex.value = 0;
  } catch (error) {
    console.error('User search failed:', error);
    mentionSuggestions.value = [];
  }
}, 300);

// Methods
const handleInput = () => {
  adjustTextareaHeight();
  checkForMentions();
};

const adjustTextareaHeight = () => {
  if (!messageInput.value) return;
  
  messageInput.value.style.height = 'auto';
  const scrollHeight = messageInput.value.scrollHeight;
  const maxHeight = 200; // Max height in pixels
  
  if (scrollHeight > maxHeight) {
    messageInput.value.style.height = `${maxHeight}px`;
    messageInput.value.style.overflowY = 'auto';
  } else {
    messageInput.value.style.height = `${scrollHeight}px`;
    messageInput.value.style.overflowY = 'hidden';
  }
  
  textareaHeight.value = messageInput.value.style.height;
};

const checkForMentions = () => {
  if (!messageInput.value) return;
  
  const cursorPosition = messageInput.value.selectionStart;
  const textBeforeCursor = messageContent.value.substring(0, cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  
  if (lastAtIndex !== -1) {
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Check if we're still in a mention (no space after @)
    if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
      currentMentionSearch.value = textAfterAt;
      mentionPosition.value = lastAtIndex;
      showMentionSuggestions.value = true;
      searchUsers(textAfterAt);
    } else {
      closeMentionSuggestions();
    }
  } else {
    closeMentionSuggestions();
  }
};

const closeMentionSuggestions = () => {
  showMentionSuggestions.value = false;
  currentMentionSearch.value = '';
  selectedMentionIndex.value = 0;
  mentionSuggestions.value = [];
};

const selectMention = (user: UserSearchResult) => {
  if (!messageInput.value) return;
  
  const beforeMention = messageContent.value.substring(0, mentionPosition.value);
  const afterMention = messageContent.value.substring(mentionPosition.value + currentMentionSearch.value.length + 1);
  
  const mentionText = `@${getDisplayName(user)}`;
  messageContent.value = `${beforeMention}${mentionText} ${afterMention}`;
  
  // Add to mentioned users
  mentionedUserIds.value.add(user.id);
  
  // Close suggestions
  closeMentionSuggestions();
  
  // Focus back on input and move cursor after mention
  nextTick(() => {
    if (messageInput.value) {
      const newCursorPosition = beforeMention.length + mentionText.length + 1;
      messageInput.value.focus();
      messageInput.value.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  });
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (showMentionSuggestions.value) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        selectedMentionIndex.value = Math.max(0, selectedMentionIndex.value - 1);
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        selectedMentionIndex.value = Math.min(mentionSuggestions.value.length - 1, selectedMentionIndex.value + 1);
        break;
        
      case 'Enter':
        event.preventDefault();
        if (mentionSuggestions.value[selectedMentionIndex.value]) {
          selectMention(mentionSuggestions.value[selectedMentionIndex.value]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        closeMentionSuggestions();
        break;
    }
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        handleFiles([file]);
      }
    }
  }
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleFiles(Array.from(input.files));
    input.value = ''; // Reset input
  }
};

const handleFiles = (files: File[]) => {
  const maxFiles = 10;
  const currentCount = attachments.value.length;
  
  if (currentCount >= maxFiles) {
    addToast({
      type: 'warning',
      message: `Maximum ${maxFiles} files allowed per message`,
    });
    return;
  }
  
  const filesToAdd = files.slice(0, maxFiles - currentCount);
  
  filesToAdd.forEach(file => {
    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      addToast({
        type: 'danger',
        message: `File "${file.name}" exceeds 25MB limit`,
      });
      return;
    }
    
    attachments.value.push({
      file,
      uploading: false,
      progress: 0,
    });
  });
};

const removeAttachment = (index: number) => {
  const attachment = attachments.value[index];
  if (attachment.url) {
    uploadService.revokeFilePreviewUrl(attachment.url);
  }
  attachments.value.splice(index, 1);
};

const uploadAttachments = async () => {
  isUploading.value = true;
  const uploadPromises: Promise<void>[] = [];
  
  for (let i = 0; i < attachments.value.length; i++) {
    const attachment = attachments.value[i];
    if (attachment.url) continue; // Already uploaded
    
    attachment.uploading = true;
    
    const uploadPromise = uploadService.uploadAttachment(props.channel.id, attachment.file, {
      onProgress: (progress) => {
        attachment.progress = progress.percentage;
      }
    }).then(result => {
      attachment.url = result.url;
      attachment.uploading = false;
      attachment.progress = 100;
    }).catch(error => {
      attachment.uploading = false;
      attachment.error = error.message;
      addToast({
        type: 'danger',
        message: `Failed to upload "${attachment.file.name}"`,
      });
    });
    
    uploadPromises.push(uploadPromise);
  }
  
  await Promise.all(uploadPromises);
  isUploading.value = false;
  
  // Remove failed uploads
  attachments.value = attachments.value.filter(a => !a.error);
};

const sendMessage = async () => {
  if (!canSend.value || isSending.value || isUploading.value) return;
  
  try {
    isSending.value = true;
    
    // Upload attachments first if any
    if (attachments.value.length > 0 && attachments.value.some(a => !a.url)) {
      await uploadAttachments();
    }
    
    // Prepare message payload
    const payload: CreateMessagePayload = {
      content: messageContent.value.trim(),
      attachmentUrls: attachments.value.filter(a => a.url).map(a => a.url!),
      mentionedUserIds: Array.from(mentionedUserIds.value),
      mentionedRoleIds: Array.from(mentionedRoleIds.value),
    };
    
    // Send message
    if (signalRService.isConnected) {
      // Send via SignalR if connected
      await signalRService.sendMessage(
        props.channel.id, 
        payload.content, 
        payload.mentionedUserIds, 
        payload.mentionedRoleIds
      );
    } else {
      // Fallback to HTTP API
      await appStore.sendMessage(props.channel.id, payload);
    }
    
    // Reset form
    messageContent.value = '';
    attachments.value = [];
    mentionedUserIds.value.clear();
    mentionedRoleIds.value.clear();
    adjustTextareaHeight();
    
    // Notify about typing stopped
    if (signalRService.isConnected) {
      signalRService.stopTyping(props.channel.id);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    addToast({
      type: 'danger',
      message: 'Failed to send message. Please try again.',
    });
  } finally {
    isSending.value = false;
  }
};

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
  // TODO: Implement emoji picker
  addToast({
    type: 'info',
    message: 'Emoji picker coming soon!',
  });
};

const formatFileSize = (bytes: number): string => {
  return uploadService.formatFileSize(bytes);
};

// Typing indicator
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
const handleTyping = () => {
  if (!signalRService.isConnected) return;
  
  // Clear existing timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Start typing
  signalRService.startTyping(props.channel.id);
  
  // Stop typing after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    signalRService.stopTyping(props.channel.id);
  }, 3000);
};

// Watch for typing
watch(messageContent, (newVal, oldVal) => {
  if (newVal.length > 0 && newVal !== oldVal) {
    handleTyping();
  }
});

// Cleanup
onUnmounted(() => {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  attachments.value.forEach(attachment => {
    if (attachment.url) {
      uploadService.revokeFilePreviewUrl(attachment.url);
    }
  });
  
  if (signalRService.isConnected && messageContent.value.length > 0) {
    signalRService.stopTyping(props.channel.id);
  }
});

// Auto-focus on mount
onMounted(() => {
  messageInput.value?.focus();
});
</script>