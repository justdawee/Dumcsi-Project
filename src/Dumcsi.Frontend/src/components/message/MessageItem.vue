<template>
  <div
      :class="showHeader ? 'mt-4' : '-mt-4'"
      class="group hover:bg-main-700/20 px-4 py-0 rounded-md transition-colors relative"
  >
    <!-- With Header (new user message or certain time passed) -->
    <div v-if="showHeader" class="flex items-start gap-3">
      <UserAvatar
          :avatar-url="message.author.avatar"
          :size="40" :user-id="message.author.id" :username="message.author.username"
          class="mt-1"
      />

      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-semibold text-text-default">{{ getDisplayName(message.author) }}</span>
          <span class="text-xs text-text-tertiary">{{ formatTime(message.timestamp) }}</span>
          <span v-if="message.editedTimestamp" class="text-xs text-text-tertiary">(edited)</span>
        </div>
        <div class="message-content">
          <p v-if="!isEditing" class="text-text-default break-words">
            {{ message.content }}
          </p>
          <MessageEdit
              v-else
              :initial-content="message.content"
              @cancel="isEditing = false"
              @save="handleSave"
          />
        </div>
      </div>
    </div>
    <!-- Without Header (continuous message) -->
    <div v-else class="flex items-start gap-3 group">
      <div class="w-10 shrink-0 text-right">
        <span class="text-xs text-text-tertiary opacity-0 group-hover:opacity-100 transition">
          {{ formatTimeShort(message.timestamp) }}
          <span v-if="message.editedTimestamp" class="text-xs text-text-tertiary">(edited)</span>
        </span>
      </div>
      <div class="flex-1 message-content">
        <p v-if="!isEditing" class="text-text-secondary break-words">
          {{ message.content }}
        </p>
        <MessageEdit
            v-else
            :initial-content="message.content"
            @cancel="isEditing = false"
            @save="handleSave"
        />
      </div>
    </div>

    <div
        v-if="!isEditing"
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
      :content-details="message.content"
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
import MessageEdit from './MessageEdit.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type {MessageDto} from '@/services/types';
import {useUserDisplay} from '@/composables/useUserDisplay';

// --- Props & Emits ---
const props = defineProps<{
  message: MessageDto;
  previousMessage: MessageDto | null;
  currentUserId: number | undefined;
}>();

const emit = defineEmits<{
  (e: 'edit', payload: { messageId: number; content: { content: string } }): void;
  (e: 'delete', messageId: number): void;
}>();

const {getDisplayName} = useUserDisplay();

// --- State ---
const isEditing = ref(false);
const isDeleteModalOpen = ref(false);

// --- Computed Properties ---
const showHeader = computed(() => {
  if (!props.previousMessage) return true;
  if (props.previousMessage.author.id !== props.message.author.id) return true;

  const prevTime = new Date(props.previousMessage.timestamp);
  const currTime = new Date(props.message.timestamp);
  const diffMinutes = (currTime.getTime() - prevTime.getTime()) / (1000 * 60);

  return diffMinutes > 5;
});

const canEdit = computed(() => props.message.author.id === props.currentUserId);
const canDelete = computed(() => props.message.author.id === props.currentUserId);


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

const handleSave = (newContent: string) => {
  emit('edit', {messageId: props.message.id, content: {content: newContent}});
  isEditing.value = false;
};

const handleDelete = () => {
  isDeleteModalOpen.value = true;
};

const confirmDelete = () => {
  emit('delete', props.message.id);
  isDeleteModalOpen.value = false;
};
</script>

<style scoped>
.message-content {
  @apply whitespace-pre-wrap break-words;
}
</style>