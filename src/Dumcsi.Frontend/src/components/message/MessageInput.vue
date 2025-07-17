<template>
  <div class="relative">
    <!-- Attachment Preview -->
    <div v-if="attachments.length > 0" class="mb-2 p-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
      <div class="flex flex-wrap gap-2">
        <div
            v-for="(attachment, index) in attachments"
            :key="index"
            class="relative group"
        >
          <!-- Image Preview -->
          <div v-if="attachment.url" class="relative">
            <img
                :src="attachment.url"
                :alt="attachment.file.name"
                class="h-20 w-20 object-cover rounded"
            />
            <div v-if="attachment.uploading"
                 class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded">
              <div class="relative w-10 h-10">
                <svg class="w-full h-full" viewBox="0 0 36 36">
                  <path class="text-gray-700"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                        stroke-width="4"></path>
                  <path class="text-primary"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                        :stroke-dasharray="`${attachment.progress}, 100`" stroke-width="4"
                        stroke-linecap="round"></path>
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">{{
                    attachment.progress
                  }}%</span>
              </div>
            </div>
          </div>
          <!-- Generic File Preview -->
          <div v-else class="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded h-20 w-48">
            <File class="w-6 h-6 text-gray-400 flex-shrink-0"/>
            <div class="flex flex-col min-w-0">
              <span class="text-sm text-gray-300 truncate">{{ attachment.file.name }}</span>
              <span class="text-xs text-gray-500">{{ uploadService.formatFileSize(attachment.file.size) }}</span>
            </div>
          </div>
          <!-- Remove Button -->
          <button
              v-if="!attachment.uploading"
              @click="removeAttachment(index)"
              class="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              title="Remove file"
          >
            <X class="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </div>

    <!-- Mention Suggestions -->
    <div
        v-if="showMentionSuggestions && mentionSuggestions.length > 0"
        class="absolute bottom-full mb-2 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto scrollbar-thin"
    >
      <div class="p-1">
        <button
            v-for="(user, index) in mentionSuggestions"
            :key="user.id"
            @click="selectMention(user)"
            :class="[
            'w-full flex items-center gap-2 p-2 rounded hover:bg-primary/20 transition',
            { 'bg-primary/20': index === selectedMentionIndex }
          ]"
        >
          <UserAvatar :user="user" :size="24"/>
          <div class="flex-1 text-left">
            <div class="text-sm font-medium text-white">{{ getDisplayName(user) }}</div>
            <div v-if="user.globalNickname" class="text-xs text-gray-400">@{{ user.username }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Input Area -->
    <div class="flex items-end gap-2 bg-gray-800/80 rounded-lg p-2">
      <input ref="fileInput" type="file" multiple class="hidden" @change="onFileSelected"/>

      <button
          @click="fileInput?.click()"
          :disabled="isUploading || attachments.length >= 10"
          class="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Attach files (max 10)"
      >
        <Paperclip class="w-5 h-5"/>
      </button>

      <textarea
          ref="messageInput"
          v-model="messageContent"
          @input="handleInput"
          @keydown="handleKeyDown"
          :placeholder="`Message #${props.channel.name}`"
          :disabled="isSending || isUploading"
          class="
          flex-1 bg-transparent text-gray-100 placeholder-gray-400
          resize-none max-h-[200px] scrollbar-thin outline-none
          focus:outline-none border-none focus:border-none ring-0
          focus:ring-0 focus:ring-offset-0 focus:ring-transparent
          "
          :style="{ height: textareaHeight }"
          rows="1"
      />

      <button
          @click="handleSend"
          :disabled="!canSend"
          :class="[
          'p-2 rounded-full transition',
          canSend
            ? 'text-primary bg-primary/20 hover:bg-primary/30'
            : 'text-gray-500 cursor-not-allowed'
        ]"
          type="button"
          title="Send Message"
      >
        <Send v-if="!isSending" class="w-5 h-5"/>
        <Loader2 v-else class="w-5 h-5 animate-spin"/>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, nextTick, onUnmounted} from 'vue';
import {useAppStore} from '@/stores/app';
import {useUserDisplay} from '@/composables/useUserDisplay';
import uploadService from '@/services/uploadService';

// Import the new composables
import {useAttachments} from '@/composables/useAttachments';
import {useMentions} from '@/composables/useMentions';
import {useTypingIndicator} from '@/composables/useTypingIndicator';

// Component imports
import {Paperclip, Send, X, File, Loader2} from 'lucide-vue-next';
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
  checkForMentions,
  selectMention,
  handleMentionKeyDown,
  clearMentions
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
        mentionedRoleIds: []
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
<style scoped>
@reference "@/style.css";

.no-outline {
  outline: none;
  border: none;
}

.no-outline:focus {
  outline: none;
  border: none;
}
</style>
