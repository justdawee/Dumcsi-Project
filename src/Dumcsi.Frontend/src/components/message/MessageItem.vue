<template>
  <div 
    class="group hover:bg-secondary/20 px-4 py-0 rounded-md transition-colors relative"
    :class="{ 'mt-4': showHeader }"
  >
    <div v-if="showHeader" class="flex items-start gap-3 mb-1">
      <UserAvatar
        :user="message.author" :size="40"
        :avatar-url="message.author.avatar"
      />
      
      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-semibold text-white">{{ getDisplayName(message.author) }}</span>
          <span class="text-xs text-gray-500">{{ formatTime(message.timestamp) }}</span>
          <span v-if="message.editedTimestamp" class="text-xs text-gray-500">(edited)</span>
        </div>
        <div class="message-content">
          <p v-if="!isEditing" class="text-gray-100 break-words">
            {{ message.content }}
          </p>
          <MessageEdit
            v-else
            :initial-content="message.content"
            @save="handleSave"
            @cancel="isEditing = false"
          />
        </div>
      </div>
    </div>
    
    <div v-else class="flex items-start gap-3 group">
      <div class="w-10 shrink-0 text-right">
        <span class="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition">
          {{ formatTimeShort(message.timestamp) }}
          <span v-if="message.editedTimestamp" class="text-xs text-gray-500">(edited)</span>
        </span>
      </div>
      <div class="flex-1 message-content">
        <p v-if="!isEditing" class="text-gray-100 break-words">
          {{ message.content }}
        </p>
        <MessageEdit
          v-else
          :initial-content="message.content"
          @save="handleSave"
          @cancel="isEditing = false"
        />
      </div>
    </div>
    
    <div 
      v-if="!isEditing"
      class="absolute right-4 -top-3 bg-gray-700 rounded-lg shadow-lg 
             opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
    >
      <button
        v-if="canEdit"
        @click="isEditing = true"
        class="p-1.5 hover:bg-gray-600 rounded-sm transition"
        title="Edit message"
      >
        <Edit3 class="w-4 h-4 text-gray-300" />
      </button>
      <button
        v-if="canDelete"
        @click="handleDelete"
        class="p-1.5 hover:bg-gray-600 rounded-sm transition"
        title="Delete message"
      >
        <Trash2 class="w-4 h-4 text-gray-300" />
      </button>
    </div>
  </div>
  <ConfirmModal
    v-model="isDeleteModalOpen"
    title="Delete Message"
    message="Are you sure you want to delete this message? This action cannot be undone."
    :content-details="message.content"
    confirm-text="Delete Message"
    @confirm="confirmDelete"
    intent="danger"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Edit3, Trash2 } from 'lucide-vue-next';
import MessageEdit from './MessageEdit.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type { MessageDto } from '@/services/types';
import { useUserDisplay } from '@/composables/useUserDisplay';

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

const { getDisplayName } = useUserDisplay();

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
  
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  
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
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
};

const handleSave = (newContent: string) => {
  emit('edit', { messageId: props.message.id, content: { content: newContent } });
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