<template>
  <div>
    <!-- Date separator -->
    <div v-if="showDate" class="flex items-center my-4">
      <div class="flex-1 h-px bg-[var(--bg-hover)]"></div>
      <span class="px-3 text-xs text-[var(--text-secondary)] font-medium">
        {{ formatDate(messages[0].createdAt) }}
      </span>
      <div class="flex-1 h-px bg-[var(--bg-hover)]"></div>
    </div>

    <!-- Message group -->
    <div class="group flex gap-4 hover:bg-[var(--bg-hover)]/30 px-2 py-1 rounded-lg transition-colors">
      <!-- Avatar -->
      <div class="flex-shrink-0 pt-0.5">
        <UserAvatar :user="messages[0].author" :size="40" />
      </div>

      <!-- Messages -->
      <div class="flex-1 min-w-0">
        <!-- Header (username and timestamp) -->
        <div class="flex items-baseline gap-2 mb-1">
          <span class="font-semibold text-[var(--text-primary)] hover:underline cursor-pointer">
            {{ messages[0].author.username }}
          </span>
          <span class="text-xs text-[var(--text-secondary)]">
            {{ formatTime(messages[0].createdAt) }}
          </span>
        </div>

        <!-- Message content -->
        <div class="space-y-1">
          <div
            v-for="(message, index) in messages"
            :key="message.id"
            class="group/message flex items-start gap-2 -ml-2 pl-2 py-0.5 rounded hover:bg-[var(--bg-hover)]/50"
          >
            <!-- Timestamp for grouped messages -->
            <span
              v-if="index > 0"
              class="text-xs text-[var(--text-secondary)] opacity-0 group-hover/message:opacity-100 transition-opacity w-12 flex-shrink-0 pt-0.5"
            >
              {{ formatTime(message.createdAt, true) }}
            </span>
            <div v-else class="w-12 flex-shrink-0"></div>

            <!-- Message content -->
            <div class="flex-1">
              <!-- Reply preview -->
              <div v-if="message.replyTo" class="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1">
                <CornerUpRight class="w-3 h-3" />
                <span>@{{ message.replyTo.author.username }}</span>
                <span class="truncate">{{ message.replyTo.content }}</span>
              </div>

              <!-- Message text -->
              <p class="text-[var(--text-primary)] break-words whitespace-pre-wrap">
                {{ message.content }}
                <span v-if="message.isEdited" class="text-xs text-[var(--text-secondary)] ml-1">(edited)</span>
              </p>

              <!-- Attachments -->
              <div v-if="message.attachmentUrls && message.attachmentUrls.length > 0" class="mt-2 space-y-2">
                <img
                  v-for="(url, i) in message.attachmentUrls"
                  :key="i"
                  :src="url"
                  :alt="`Attachment ${i + 1}`"
                  class="max-w-md rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  @click="openImage(url)"
                />
              </div>
            </div>

            <!-- Message actions -->
            <div
              class="opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1 -mt-1"
            >
              <button
                @click="emit('reply', message)"
                class="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
                title="Reply"
              >
                <Reply class="w-4 h-4" />
              </button>
              <button
                v-if="canEdit(message)"
                @click="emit('edit', message)"
                class="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
                title="Edit"
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                v-if="canDelete(message)"
                @click="emit('delete', message)"
                class="p-1.5 rounded hover:bg-red-500/20 transition-colors text-[var(--text-secondary)] hover:text-red-500"
                title="Delete"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CornerUpRight, Reply, Edit2, Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import type { Message } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'

interface Props {
  messages: Message[]
  showDate?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [message: Message]
  delete: [message: Message]
  reply: [message: Message]
}>()

const authStore = useAuthStore()

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    })
  }
}

function formatTime(dateString: string, shortFormat = false): string {
  const date = new Date(dateString)
  if (shortFormat) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }) + ' ' + formatDate(dateString)
}

function canEdit(message: Message): boolean {
  return message.authorId === authStore.user?.id
}

function canDelete(message: Message): boolean {
  // Users can delete their own messages, or server admins can delete any message
  return message.authorId === authStore.user?.id
}

function openImage(url: string) {
  window.open(url, '_blank')
}
</script>