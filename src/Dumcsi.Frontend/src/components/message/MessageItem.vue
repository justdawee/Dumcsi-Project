<template>
  <div
      :class="showHeader ? 'mt-4' : 'mt-1'"
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
          <span v-if="message.editedTimestamp" class="text-xs text-text-tertiary">{{ t('chat.item.edited') }}</span>
        </div>
        <div class="message-content">
          <MessageContentParser
              v-if="!isEditing"
              :content="displayContent"
              :mentioned-user-ids="message.mentions.map(user => user.id)"
              :mentioned-role-ids="message.mentionRoleIds"
              class="text-text-secondary"
          />
          <MessageEdit
              v-else
              :initial-content="extractTextContent(message.content, message.attachments)"
              @cancel="isEditing = false"
              @save="handleSave"
          />
          <MessageAttachments
              v-if="!isEditing && message.attachments.length > 0"
              :attachments="message.attachments"
              :message="message"
              class="mt-2"
          />
          <MediaPreview
              v-if="!isEditing"
              :content="message.content"
              :attachments="message.attachments"
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
      {{ formatTimeShort(message.timestamp) }}
      <span v-if="message.editedTimestamp" class="text-xs text-text-tertiary">{{ t('chat.item.edited') }}</span>
    </span>
      </div>
      <div class="flex-1 message-content">
        <div class="flex-1">
          <MessageContentParser
              v-if="!isEditing"  :content="displayContent"
              :mentioned-user-ids="message.mentions.map(user => user.id)"
              :mentioned-role-ids="message.mentionRoleIds"
          />
          <MessageEdit
              v-else
              :initial-content="extractTextContent(message.content, message.attachments)"
              @cancel="isEditing = false"
              @save="handleSave"
          />
          <MessageAttachments
              v-if="!isEditing && message.attachments.length > 0"
              :attachments="message.attachments"
              :message="message"
              class="mt-2"
          />
          <MediaPreview
              v-if="!isEditing"
              :content="message.content"
              :attachments="message.attachments"
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
          :title="t('chat.item.editTooltip')"
          @click="isEditing = true"
      >
        <Edit3 class="w-4 h-4 text-text-secondary"/>
      </button>
      <button
          v-if="canDelete"
          class="p-1.5 hover:bg-main-700 rounded-sm transition"
          :title="t('chat.item.deleteTooltip')"
          @click="handleDelete"
      >
        <Trash2 class="w-4 h-4 text-text-secondary"/>
      </button>
    </div>
  </div>
  <ConfirmModal
      v-model="isDeleteModalOpen"
      :content-details="message.content"
      :confirm-text="t('chat.item.confirmText')"
      intent="danger"
      :message="t('chat.item.confirmMessage')"
      :title="t('chat.item.confirmTitle')"
      @confirm="confirmDelete"
  />
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue';
import { useI18n } from 'vue-i18n';
import {Edit3, Trash2} from 'lucide-vue-next';
import MessageEdit from './MessageEdit.vue';
import MessageContentParser from './MessageContentParser.vue';
import MessageAttachments from './MessageAttachments.vue';
import MediaPreview from './MediaPreview.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type {MessageDto} from '@/services/types';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {extractTextContent, reconstructMessageContent} from '@/utils/messageContent';
import { useAppearanceSettings } from '@/composables/useAppearanceSettings';

// --- Props & Emits ---
const props = defineProps<{
  message: MessageDto;
  previousMessage: MessageDto | null;
  currentUserId: number | undefined;
}>();

const emit = defineEmits<{
  (e: 'edit', payload: { messageId: number; content: { content: string } }): void;
  (e: 'delete', messageId: number): void;
  (e: 'mediaLoaded'): void;
}>();

const {getDisplayName} = useUserDisplay();
const { t, locale } = useI18n();

// --- State ---
const isEditing = ref(false);
const isDeleteModalOpen = ref(false);
const displayContent = ref(props.message.content);

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
const { appearance } = useAppearanceSettings();


// --- Methods ---
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

  const currentLocale = String((locale as any).value || 'en-US');
  const time = new Intl.DateTimeFormat(currentLocale, { hour: 'numeric', minute: '2-digit', hour12: appearance.timeFormat === '12h' }).format(date);
  if (isToday) return t('chat.item.todayAt', { time });
  if (isYesterday) return t('chat.item.yesterdayAt', { time });

  const datePart = new Intl.DateTimeFormat(currentLocale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }).format(date);
  return `${datePart} ${t('chat.item.atTime', { time })}`;
};

const formatTimeShort = (dateString: string) => {
  const date = new Date(dateString);
  const currentLocale = String((locale as any).value || 'en-US');
  return new Intl.DateTimeFormat(currentLocale, { hour: 'numeric', minute: '2-digit', hour12: appearance.timeFormat === '12h' }).format(date);
};

const handleSave = (newTextContent: string) => {
  const reconstructedContent = reconstructMessageContent(props.message.content, newTextContent);
  emit('edit', {messageId: props.message.id, content: {content: reconstructedContent}});
  isEditing.value = false;
};

const onContentFiltered = (filtered: string) => {
  displayContent.value = filtered;
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
