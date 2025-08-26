<template>
  <div
      :class="showHeader ? 'mt-4' : 'mt-1'"
      class="group hover:bg-main-700/20 px-4 py-0 rounded-md transition-colors relative"
  >
    <!-- With Header (new user message or certain time passed) -->
    <div v-if="showHeader" class="flex items-start gap-3">
      <UserAvatar
          :avatar-url="author.avatar"
          :size="40" 
          :user-id="author.id" 
          :username="author.username"
          class="mt-1"
      />

      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-semibold text-text-default">{{ getDisplayName(author) }}</span>
          <span class="text-xs text-text-tertiary">{{ formatTime(timestamp) }}</span>
          <span v-if="editedTimestamp" class="text-xs text-text-tertiary">(edited)</span>
        </div>
        <div class="message-content">
          <MessageContentParser
              v-if="!isEditing"
              :content="displayContent"
              :mentioned-user-ids="mentions.map(user => user.id)"
              :mentioned-role-ids="mentionRoleIds || []"
              class="text-text-secondary"
          />
          <MessageEdit
              v-else
              :initial-content="extractTextContent(content, attachments)"
              @cancel="isEditing = false"
              @save="handleSave"
          />
          <MessageAttachments
              v-if="!isEditing && attachments.length > 0"
              :attachments="attachments"
              :message="messageForAttachments"
              class="mt-2"
          />
          <MediaPreview
              v-if="!isEditing"
              :content="content"
              :attachments="attachments"
              class="mt-2"
              @media-loaded="$emit('mediaLoaded')"
              @content-filtered="onContentFiltered"
          />
        </div>
      </div>
    </div>
    <!-- Without Header (continuous message) -->
    <div v-else class="flex items-start gap-3 group">
      <div class="w-10 shrink-0 text-right">
    <span class="text-xs text-text-tertiary opacity-0 group-hover:opacity-100 transition">
      {{ formatTimeShort(timestamp) }}
      <span v-if="editedTimestamp" class="text-xs text-text-tertiary">(edited)</span>
    </span>
      </div>
      <div class="flex-1 message-content">
        <div class="flex-1">
          <MessageContentParser
              v-if="!isEditing"  
              :content="displayContent"
              :mentioned-user-ids="mentions.map(user => user.id)"
              :mentioned-role-ids="mentionRoleIds || []"
          />
          <MessageEdit
              v-else
              :initial-content="extractTextContent(content, attachments)"
              @cancel="isEditing = false"
              @save="handleSave"
          />
          <MessageAttachments
              v-if="!isEditing && attachments.length > 0"
              :attachments="attachments"
              :message="messageForAttachments"
              class="mt-2"
          />
          <MediaPreview
              v-if="!isEditing"
              :content="content"
              :attachments="attachments"
              class="mt-2"
              @media-loaded="$emit('mediaLoaded')"
              @content-filtered="onContentFiltered"
          />
        </div>
      </div>
    </div>

    <!-- Message Edit/Delete buttons -->
    <div
        v-if="!isEditing && (canEdit || canDelete)"
        class="absolute right-4 -top-3 bg-bg-surface rounded-lg shadow-lg
             opacity-0 group-hover:opacity-100 transition-opacity flex items-center border border-border-default"
    >
      <button
          v-if="canEdit"
          class="p-1.5 hover:bg-main-700 rounded-sm transition"
          title="Edit message"
          @click="isEditing = true"
      >
        <Edit3 class="w-4 h-4 text-text-secondary"/>
      </button>
      <button
          v-if="canDelete"
          class="p-1.5 hover:bg-main-700 rounded-sm transition"
          title="Delete message"
          @click="handleDelete"
      >
        <Trash2 class="w-4 h-4 text-text-secondary"/>
      </button>
    </div>
  </div>
  <ConfirmModal
      v-model="isDeleteModalOpen"
      :content-details="content"
      confirm-text="Delete Message"
      intent="danger"
      message="Are you sure you want to delete this message? This action cannot be undone."
      title="Delete Message"
      @confirm="confirmDelete"
  />
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue';
import {Edit3, Trash2} from 'lucide-vue-next';
import MessageEdit from '../message/MessageEdit.vue';
import MessageContentParser from '../message/MessageContentParser.vue';
import MessageAttachments from '../message/MessageAttachments.vue';
import MediaPreview from '../message/MediaPreview.vue';
import UserAvatar from '../common/UserAvatar.vue';
import ConfirmModal from '../modals/ConfirmModal.vue';
import type {MessageDto, DmMessageDto} from '@/services/types';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {extractTextContent, reconstructMessageContent} from '@/utils/messageContent';

// Define the union type for messages
type UniversalMessage = MessageDto | DmMessageDto;

// --- Props & Emits ---
const props = defineProps<{
  message: UniversalMessage;
  previousMessage: UniversalMessage | null;
  currentUserId: number | undefined;
}>();

const emit = defineEmits<{
  (e: 'edit', payload: { messageId: number; content: { content: string } }): void;
  (e: 'delete', messageId: number): void;
  (e: 'mediaLoaded'): void;
}>();

const {getDisplayName} = useUserDisplay();

// --- State ---
const isEditing = ref(false);
const isDeleteModalOpen = ref(false);

// --- Computed Properties ---

// Determine if this is a server message or DM message
const isServerMessage = computed(() => 'author' in props.message);

// Extract common properties
const id = computed(() => props.message.id);
const content = computed(() => props.message.content);
const timestamp = computed(() => props.message.timestamp);
const editedTimestamp = computed(() => props.message.editedTimestamp);

const author = computed(() => {
  if (isServerMessage.value) {
    return (props.message as MessageDto).author;
  } else {
    return (props.message as DmMessageDto).sender;
  }
});

const attachments = computed(() => {
  if (isServerMessage.value) {
    return (props.message as MessageDto).attachments || [];
  } else {
    return (props.message as DmMessageDto).attachments || [];
  }
});

const mentions = computed(() => {
  if (isServerMessage.value) {
    return (props.message as MessageDto).mentions || [];
  } else {
    return (props.message as DmMessageDto).mentions || [];
  }
});

const mentionRoleIds = computed(() => {
  if (isServerMessage.value) {
    return (props.message as MessageDto).mentionRoleIds || [];
  } else {
    return [];
  }
});

// Create a compatible message object for MessageAttachments component
const messageForAttachments = computed(() => props.message as MessageDto);

const showHeader = computed(() => {
  if (!props.previousMessage) return true;
  
  const prevAuthor = isServerMessage.value ? 
    (props.previousMessage as MessageDto).author : 
    (props.previousMessage as DmMessageDto).sender;
    
  if (prevAuthor.id !== author.value.id) return true;

  const prevTime = new Date(props.previousMessage.timestamp);
  const currTime = new Date(timestamp.value);
  const diffMinutes = (currTime.getTime() - prevTime.getTime()) / (1000 * 60);

  return diffMinutes > 5;
});

const canEdit = computed(() => author.value.id === props.currentUserId);
const canDelete = computed(() => author.value.id === props.currentUserId);

// Display content starts as the raw content then updates from MediaPreview filter events
const displayContent = ref(content.value);

// --- Methods ---
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

  const time = date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: false});

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }) + ` at ${time}`;
};

const formatTimeShort = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: false});
};

const handleSave = (newTextContent: string) => {
  const reconstructedContent = reconstructMessageContent(content.value, newTextContent);
  emit('edit', {messageId: id.value, content: {content: reconstructedContent}});
  isEditing.value = false;
};

const handleDelete = () => {
  isDeleteModalOpen.value = true;
};

const confirmDelete = () => {
  emit('delete', id.value);
  isDeleteModalOpen.value = false;
};

const onContentFiltered = (filtered: string) => {
  displayContent.value = filtered;
};
</script>

<style scoped>
.message-content {
  @apply whitespace-pre-wrap break-words;
}
</style>
