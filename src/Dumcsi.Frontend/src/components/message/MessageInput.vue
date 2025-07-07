<template>
  <div class="relative">
    <!-- Attachment Preview -->
    <div v-if="attachments.length > 0" class="mb-2 p-2 bg-gray-700 rounded-lg">
      <div class="flex flex-wrap gap-2">
        <div 
          v-for="(attachment, index) in attachments" 
          :key="index"
          class="relative group"
        >
          <div v-if="uploadService.isImage(attachment.file)" class="relative">
            <img 
              :src="attachment.url" 
              :alt="attachment.file.name"
              class="h-20 w-20 object-cover rounded"
            />
            <div v-if="attachment.uploading" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
              <div class="text-white text-xs">{{ attachment.progress }}%</div>
            </div>
          </div>
          <div v-else class="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded">
            <File class="w-4 h-4 text-gray-400" />
            <span class="text-sm text-gray-300 max-w-[150px] truncate">{{ attachment.file.name }}</span>
            <span class="text-xs text-gray-500">{{ uploadService.formatFileSize(attachment.file.size) }}</span>
          </div>
          <button
            v-if="!attachment.uploading"
            @click="removeAttachment(index)"
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mention Suggestions -->
    <div 
      v-if="showMentionSuggestions && mentionSuggestions.length > 0"
      class="absolute bottom-full mb-2 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      <div class="p-1">
        <button
          v-for="(user, index) in mentionSuggestions"
          :key="user.id"
          @click="selectMention(user)"
          :class="[
            'w-full flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition',
            { 'bg-gray-700': index === selectedMentionIndex }
          ]"
        >
          <UserAvatar
            :avatar-url="getAvatarUrl(user)"
            :username="user.username"
            :size="24"
          />
          <div class="flex-1 text-left">
            <div class="text-sm font-medium text-white">{{ getDisplayName(user) }}</div>
            <div v-if="user.globalNickname" class="text-xs text-gray-400">@{{ user.username }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div 
      v-if="typingUsers.length > 0" 
      class="absolute -top-6 left-0 text-xs text-gray-400 italic"
    >
      <span v-if="typingUsers.length === 1">
        {{ getDisplayName(typingUsers[0]) }} is typing...
      </span>
      <span v-else-if="typingUsers.length === 2">
        {{ getDisplayName(typingUsers[0]) }} and {{ getDisplayName(typingUsers[1]) }} are typing...
      </span>
      <span v-else>
        {{ getDisplayName(typingUsers[0]) }} and {{ typingUsers.length - 1 }} others are typing...
      </span>
    </div>

    <!-- Input Area -->
    <div class="flex items-end gap-2 bg-gray-700 rounded-lg p-2">
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        accept="image/*,application/pdf,text/plain,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4,video/webm,audio/mpeg,audio/wav,audio/webm"
        @change="handleFileSelect"
      />
      
      <button
        @click="fileInput?.click()"
        :disabled="isUploading || attachments.length >= 10"
        class="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
        title="Attach files"
      >
        <Paperclip class="w-5 h-5" />
      </button>

      <button
        @click="showEmojiPicker = !showEmojiPicker"
        class="p-2 text-gray-400 hover:text-gray-200 transition"
        title="Add emoji"
      >
        <Smile class="w-5 h-5" />
      </button>

      <textarea
        ref="messageInput"
        v-model="messageContent"
        @input="handleInput"
        @keydown="handleKeyDown"
        :placeholder="`Message #${channel.name}`"
        :disabled="isSending || isUploading"
        class="flex-1 bg-transparent text-white placeholder-gray-400 resize-none outline-none max-h-[200px] scrollbar-thin"
        :style="{ height: textareaHeight }"
        rows="1"
      />

      <button
        @click="handleSend"
        :disabled="!canSend || isSending || isUploading"
        :class="[
          'p-2 transition',
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
import UserAvatar from '@/components/common/UserAvatar.vue';
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

// Typing indicator
const typingTimeout = ref<NodeJS.Timeout>();
const lastTypingNotification = ref(0);
const typingUsers = computed(() => {
  const channelTypingUsers = appStore.typingUsers.get(props.channel.id) || new Set();
  return Array.from(channelTypingUsers)
    .filter(userId => userId !== appStore.currentUserId)
    .map(userId => appStore.members.find(m => m.userId === userId))
    .filter(Boolean);
});

// Computed
const canSend = computed(() => {
  return (messageContent.value.trim().length > 0 || attachments.value.length > 0) 
    && messageContent.value.length <= 2000
    && !attachments.value.some(a => a.uploading);
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
  sendTypingIndicator();
};

const adjustTextareaHeight = () => {
  if (!messageInput.value) return;
  
  messageInput.value.style.height = 'auto';
  const scrollHeight = messageInput.value.scrollHeight;
  const maxHeight = 200;
  
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
  
  mentionedUserIds.value.add(user.id);
  closeMentionSuggestions();
  
  nextTick(() => {
    if (messageInput.value) {
      const newCursorPosition = beforeMention.length + mentionText.length + 1;
      messageInput.value.focus();
      messageInput.value.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  });
};

const sendTypingIndicator = () => {
  const now = Date.now();
  if (now - lastTypingNotification.value > 2000) {
    lastTypingNotification.value = now;
    signalRService.sendTypingIndicator(props.channel.id);
  }
  
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }
  
  typingTimeout.value = setTimeout(() => {
    lastTypingNotification.value = 0;
  }, 3000);
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
      case 'Tab':
        if (mentionSuggestions.value[selectedMentionIndex.value]) {
          event.preventDefault();
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
    handleSend();
  }
};

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const files = Array.from(input.files);
  const totalAttachments = attachments.value.length + files.length;
  
  if (totalAttachments > 10) {
    addToast({
      type: 'warning',
      message: 'You can only attach up to 10 files per message',
      duration: 3000
    });
    return;
  }
  
  for (const file of files) {
    const attachment: Attachment = {
      file,
      url: uploadService.generatePreviewUrl(file),
      uploading: false,
      progress: 0
    };
    attachments.value.push(attachment);
  }
  
  input.value = '';
};

const removeAttachment = (index: number) => {
  const attachment = attachments.value[index];
  if (attachment.url) {
    uploadService.revokePreviewUrl(attachment.url);
  }
  attachments.value.splice(index, 1);
};

const uploadAttachments = async () => {
  if (attachments.value.length === 0) return [];
  
  isUploading.value = true;
  const uploadedUrls: string[] = [];
  
  try {
    for (const attachment of attachments.value) {
      attachment.uploading = true;
      
      try {
        const response = await uploadService.uploadAttachment(props.channel.id, attachment.file, {
          onProgress: (progress) => {
            attachment.progress = progress;
          }
        });
        
        uploadedUrls.push(response.url);
        attachment.uploading = false;
      } catch (error: any) {
        attachment.uploading = false;
        attachment.error = error.message;
        throw error;
      }
    }
    
    return uploadedUrls;
  } finally {
    isUploading.value = false;
  }
};

const handleSend = async () => {
  if (!canSend.value || isSending.value) return;
  
  isSending.value = true;
  
  try {
    let attachmentUrls: string[] = [];
    
    if (attachments.value.length > 0) {
      try {
        attachmentUrls = await uploadAttachments();
      } catch (error: any) {
        addToast({
          type: 'danger',
          message: `Failed to upload attachments: ${error.message}`,
          duration: 5000
        });
        isSending.value = false;
        return;
      }
    }
    
    const payload: CreateMessagePayload = {
      content: messageContent.value.trim(),
      attachments: attachmentUrls,
      mentionedUserIds: Array.from(mentionedUserIds.value),
      mentionedRoleIds: Array.from(mentionedRoleIds.value)
    };
    
    await appStore.sendMessage(props.channel.id, payload);
    
    // Clear form
    messageContent.value = '';
    attachments.value.forEach(a => {
      if (a.url) uploadService.revokePreviewUrl(a.url);
    });
    attachments.value = [];
    mentionedUserIds.value.clear();
    mentionedRoleIds.value.clear();
    
    // Reset textarea height
    nextTick(() => {
      if (messageInput.value) {
        messageInput.value.style.height = 'auto';
        textareaHeight.value = 'auto';
      }
    });
    
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: 'Failed to send message',
      duration: 3000
    });
  } finally {
    isSending.value = false;
  }
};

// Lifecycle
onMounted(() => {
  messageInput.value?.focus();
});

onUnmounted(() => {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }
  attachments.value.forEach(a => {
    if (a.url) uploadService.revokePreviewUrl(a.url);
  });
});
</script>