<template>
  <div class="px-4 pb-4">
    <!-- Reply preview -->
    <div v-if="replyTo" class="mb-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-t-xl flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm">
        <CornerUpRight class="w-4 h-4 text-[var(--text-secondary)]" />
        <span class="text-[var(--text-secondary)]">Replying to</span>
        <span class="font-medium text-[var(--text-primary)]">{{ replyTo.author.username }}</span>
        <span class="text-[var(--text-secondary)] truncate max-w-xs">{{ replyTo.content }}</span>
      </div>
      <button @click="emit('cancelReply')" class="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Input container -->
    <div
      :class="[
        'bg-[var(--bg-secondary)] rounded-2xl shadow-md transition-all',
        replyTo ? 'rounded-t-none' : ''
      ]"
    >
      <div class="flex items-end gap-3 p-3">
        <!-- File upload button -->
        <button
          class="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
          title="Upload file"
        >
          <Paperclip class="w-5 h-5" />
        </button>

        <!-- Message input -->
        <div class="flex-1">
          <textarea
            v-model="message"
            @keydown="handleKeyDown"
            @input="handleInput"
            :placeholder="`Message #${channel.name}`"
            class="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none outline-none max-h-40"
            :rows="1"
            ref="inputRef"
          />
        </div>

        <!-- Emoji picker -->
        <button
          class="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
          title="Add emoji"
        >
          <Smile class="w-5 h-5" />
        </button>

        <!-- Send button -->
        <button
          @click="sendMessage"
          :disabled="!message.trim() || isSending"
          :class="[
            'p-2 rounded-xl transition-all',
            message.trim() 
              ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90' 
              : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-not-allowed'
          ]"
          title="Send message"
        >
          <Send class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { CornerUpRight, X, Paperclip, Smile, Send } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import signalrService from '@/services/signalrService'
import type { Channel, Message } from '@/types'

interface Props {
  channel: Channel
  replyTo?: Message | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancelReply: []
}>()

const appStore = useAppStore()
const message = ref('')
const isSending = ref(false)
const inputRef = ref<HTMLTextAreaElement>()
const typingTimeout = ref<number>()

async function sendMessage() {
  const content = message.value.trim()
  if (!content || isSending.value) return

  isSending.value = true
  try {
    await appStore.sendMessage(content)
    message.value = ''
    
    // Reset textarea height
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
    }
    
    // Clear reply
    if (props.replyTo) {
      emit('cancelReply')
    }
  } catch (error) {
    // Error handled by store
  } finally {
    isSending.value = false
  }
}

function handleKeyDown(event: KeyboardEvent) {
  // Send on Enter (without shift)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function handleInput() {
  // Auto-resize textarea
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = `${inputRef.value.scrollHeight}px`
  }

  // Handle typing indicator
  if (message.value.trim()) {
    // Clear existing timeout
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value)
    }

    // Send typing indicator
    signalrService.sendTypingIndicator(props.channel.id)

    // Set timeout to stop typing indicator
    typingTimeout.value = window.setTimeout(() => {
      // In a real app, we'd send a stop typing indicator
      // For now, the backend handles timeout
    }, 3000)
  }
}

// Focus input when reply is set
if (props.replyTo) {
  nextTick(() => {
    inputRef.value?.focus()
  })
}
</script>