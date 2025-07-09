<template>
  <div class="flex space-x-3 px-4 py-2 hover:bg-discord-gray-600/30 group">
    <UserAvatar
      :src="message.author.avatar"
      :username="message.author.username"
      size="md"
    />
    
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline space-x-2">
        <span class="font-medium text-white">
          {{ message.author.globalNickname || message.author.username }}
        </span>
        <span class="text-xs text-discord-gray-400">
          {{ formatTime(message.timestamp) }}
        </span>
        <span v-if="message.editedTimestamp" class="text-xs text-discord-gray-400">
          (edited)
        </span>
      </div>
      
      <div v-if="isEditing" class="mt-1">
        <BaseInput
          v-model="editContent"
          @keydown.enter="saveEdit"
          @keydown.esc="cancelEdit"
          class="text-sm"
        />
        <div class="flex space-x-2 mt-2">
          <BaseButton size="sm" @click="saveEdit">Save</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="cancelEdit">Cancel</BaseButton>
        </div>
      </div>
      
      <div v-else class="mt-1 message-content text-discord-gray-100" v-html="formattedContent"></div>
      
      <div v-if="message.attachments.length > 0" class="mt-2 space-y-2">
        <div v-for="attachment in message.attachments" :key="attachment.id">
          <img
            v-if="isImage(attachment.contentType)"
            :src="attachment.fileUrl"
            :alt="attachment.fileName"
            class="max-w-sm max-h-64 rounded object-cover cursor-pointer"
            @click="openImage(attachment.fileUrl)"
          />
          <div v-else class="flex items-center space-x-2 bg-discord-gray-600 rounded p-2 max-w-sm">
            <Paperclip class="w-4 h-4 text-discord-gray-400" />
            <span class="text-sm text-discord-gray-200 truncate">{{ attachment.fileName }}</span>
            <a :href="attachment.fileUrl" download class="text-discord-blurple hover:underline text-sm">
              Download
            </a>
          </div>
        </div>
      </div>
      
      <div v-if="message.reactions.length > 0" class="flex flex-wrap gap-1 mt-2">
        <button
          v-for="reaction in message.reactions"
          :key="reaction.emojiId"
          :class="[
            'flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors',
            reaction.me ? 'bg-discord-blurple/20 border border-discord-blurple' : 'bg-discord-gray-600 hover:bg-discord-gray-500'
          ]"
          @click="toggleReaction(reaction.emojiId)"
        >
          <span>{{ reaction.emojiId }}</span>
          <span class="text-xs">{{ reaction.count }}</span>
        </button>
      </div>
    </div>
    
    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
      <button
        v-if="canEdit"
        class="p-1 text-discord-gray-400 hover:text-white transition-colors"
        @click="startEdit"
      >
        <Edit3 class="w-4 h-4" />
      </button>
      <button
        v-if="canDelete"
        class="p-1 text-discord-gray-400 hover:text-discord-red transition-colors"
        @click="deleteMessage"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Paperclip, Edit3, Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/common/UserAvatar.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { Permission, type MessageDto, type EntityId, type UpdateMessageRequestDto } from '@/types'

interface Props {
  message: MessageDto
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [payload: { messageId: EntityId; content: UpdateMessageRequestDto }]
  delete: [messageId: EntityId]
  reaction: [payload: { messageId: EntityId; emojiId: string }]
}>()

const authStore = useAuthStore()

const isEditing = ref(false)
const editContent = ref('')

const canEdit = computed(() => 
  props.message.author.id === authStore.currentUser?.id
)

const canDelete = computed(() => {
  const currentUser = authStore.currentUser
  if (!currentUser) return false
  
  // Can delete own messages or with manage messages permission
  return props.message.author.id === currentUser.id
  // TODO: Add permission check for manage messages
})

const formattedContent = computed(() => {
  // Basic message formatting
  let content = props.message.content
  
  // Convert URLs to links
  content = content.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  
  // Convert line breaks
  content = content.replace(/\n/g, '<br>')
  
  return content
})

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else {
    return date.toLocaleDateString()
  }
}

const isImage = (contentType: string | null): boolean => {
  return contentType?.startsWith('image/') ?? false
}

const openImage = (url: string) => {
  window.open(url, '_blank')
}

const startEdit = () => {
  isEditing.value = true
  editContent.value = props.message.content
}

const saveEdit = () => {
  if (editContent.value.trim() !== props.message.content) {
    emit('edit', {
      messageId: props.message.id,
      content: { content: editContent.value.trim() }
    })
  }
  cancelEdit()
}

const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

const deleteMessage = () => {
  if (confirm('Are you sure you want to delete this message?')) {
    emit('delete', props.message.id)
  }
}

const toggleReaction = (emojiId: string) => {
  emit('reaction', { messageId: props.message.id, emojiId })
}
</script>