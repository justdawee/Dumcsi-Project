<template>
  <div class="bg-discord-gray-600 rounded-lg">
    <div class="flex items-end space-x-3 p-3">
      <button
        class="flex-shrink-0 p-2 text-discord-gray-400 hover:text-white transition-colors"
        @click="triggerFileInput"
      >
        <Plus class="w-5 h-5" />
      </button>
      
      <div class="flex-1">
        <textarea
          ref="textareaRef"
          v-model="message"
          :placeholder="`Message #${currentChannel?.name || 'channel'}`"
          class="w-full bg-transparent text-white placeholder-discord-gray-400 resize-none outline-none max-h-32"
          rows="1"
          @keydown="handleKeyDown"
          @input="handleInput"
        ></textarea>
      </div>
      
      <button
        class="flex-shrink-0 p-2 text-discord-gray-400 hover:text-white transition-colors"
        @click="toggleEmojiPicker"
      >
        <Smile class="w-5 h-5" />
      </button>
      
      <button
        v-if="message.trim() || attachments.length > 0"
        class="flex-shrink-0 p-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded transition-colors"
        @click="sendMessage"
        :disabled="sending"
      >
        <Send class="w-5 h-5" />
      </button>
    </div>
    
    <!-- Attachments Preview -->
    <div v-if="attachments.length > 0" class="px-3 pb-3">
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(attachment, index) in attachments"
          :key="index"
          class="relative bg-discord-gray-700 rounded p-2 flex items-center space-x-2"
        >
          <Paperclip class="w-4 h-4 text-discord-gray-400" />
          <span class="text-sm text-white truncate max-w-32">{{ attachment.name }}</span>
          <button
            class="text-discord-gray-400 hover:text-discord-red transition-colors"
            @click="removeAttachment(index)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    
    <!-- Typing Indicator -->
    <div v-if="isTyping" class="px-3 pb-2">
      <span class="text-xs text-discord-gray-400">Typing...</span>
    </div>
  </div>
  
  <!-- Hidden File Input -->
  <input
    ref="fileInputRef"
    type="file"
    multiple
    accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
    class="hidden"
    @change="handleFileSelect"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Plus, Smile, Send, Paperclip, X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { signalRService } from '@/services/signalrService'
import { messageService } from '@/services/messageService'
import { useToast } from '@/composables/useToast'
import type { CreateMessageRequestDto, EntityId, AttachmentDto } from '@/types'

interface Props {
  channelId?: EntityId
}

const props = defineProps<Props>()

const emit = defineEmits<{
  send: [payload: CreateMessageRequestDto]
}>()

const appStore = useAppStore()
const { addToast } = useToast()

const textareaRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()

const message = ref('')
const attachments = ref<File[]>([])
const uploadedAttachments = ref<AttachmentDto[]>([])
const sending = ref(false)
const isTyping = ref(false)
const typingTimer = ref<ReturnType<typeof setTimeout>>()

const currentChannel = computed(() => appStore.currentChannel)

// Auto-resize textarea
const handleInput = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 128)}px`
  }
  
  // Send typing indicator
  if (message.value.trim() && !isTyping.value) {
    isTyping.value = true
    if (props.channelId) {
      signalRService.sendTypingIndicator(props.channelId)
    }
  }
  
  // Clear typing timer
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
  }
  
  // Stop typing after 3 seconds of inactivity
  typingTimer.value = setTimeout(() => {
    isTyping.value = false
  }, 3000)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const sendMessage = async () => {
  if ((!message.value.trim() && attachments.value.length === 0) || sending.value) return
  
  try {
    sending.value = true
    
    // Upload attachments first
    const attachmentIds: number[] = []
    for (const file of attachments.value) {
      if (props.channelId) {
        const attachment = await messageService.uploadAttachment(props.channelId, file)
        attachmentIds.push(attachment.id)
      }
    }
    
    const payload: CreateMessageRequestDto = {
      content: message.value.trim(),
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined
    }
    
    emit('send', payload)
    
    // Clear form
    message.value = ''
    attachments.value = []
    uploadedAttachments.value = []
    isTyping.value = false
    
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to send message'
    })
  } finally {
    sending.value = false
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files) {
    const fileArray = Array.from(files)
    const maxFileSize = 50 * 1024 * 1024 // 50MB
    
    for (const file of fileArray) {
      if (file.size > maxFileSize) {
        addToast({
          type: 'danger',
          message: `File "${file.name}" is too large. Maximum size is 50MB.`
        })
        continue
      }
      
      if (attachments.value.length >= 10) {
        addToast({
          type: 'warning',
          message: 'Maximum 10 files allowed per message.'
        })
        break
      }
      
      attachments.value.push(file)
    }
  }
  
  // Clear file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const toggleEmojiPicker = () => {
  // Emoji picker functionality would be implemented here
  addToast({
    type: 'info',
    message: 'Emoji picker not yet implemented'
  })
}

// Focus textarea when channel changes
watch(() => props.channelId, () => {
  nextTick(() => {
    textareaRef.value?.focus()
  })
})
</script>