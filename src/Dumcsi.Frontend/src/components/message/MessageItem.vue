<template>
  <div 
    class="group hover:bg-gray-750/50 px-4 py-1 rounded-sm transition-colors"
    :class="{ 'mt-4': showHeader }"
  >
    <!-- Message Header (Avatar + Username + Time) -->
    <div v-if="showHeader" class="flex items-start gap-3 mb-1">
      <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
        <span class="text-sm font-semibold text-primary">
          {{ getUserInitials(message.senderUsername) }}
        </span>
      </div>
      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-semibold text-white">{{ message.senderUsername }}</span>
          <span class="text-xs text-gray-500">{{ formatTime(message.createdAt) }}</span>
        </div>
        <!-- Message Content for header messages -->
        <div class="message-content">
          <p v-if="!isEditing" class="text-gray-100 break-words">
            {{ message.content }}
            <span v-if="message.isEdited" class="text-xs text-gray-500 ml-1">(edited)</span>
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
    
    <!-- Compact Message (no header) -->
    <div v-else class="flex items-start gap-3 group">
      <div class="w-10 shrink-0 text-right">
        <span class="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition">
          {{ formatTimeShort(message.createdAt) }}
        </span>
      </div>
      <div class="flex-1 message-content">
        <p v-if="!isEditing" class="text-gray-100 break-words">
          {{ message.content }}
          <span v-if="message.isEdited" class="text-xs text-gray-500 ml-1">(edited)</span>
        </p>
        <MessageEdit
          v-else
          :initial-content="message.content"
          @save="handleSave"
          @cancel="isEditing = false"
        />
      </div>
    </div>
    
    <!-- Message Actions -->
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { Edit3, Trash2 } from 'lucide-vue-next'
import MessageEdit from './MessageEdit.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  previousMessage: {
    type: Object,
    default: null
  },
  currentUserId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete'])

const isEditing = ref(false)

const showHeader = computed(() => {
  if (!props.previousMessage) return true
  if (props.previousMessage.senderId !== props.message.senderId) return true
  
  // Show header if more than 5 minutes between messages
  const prevTime = new Date(props.previousMessage.createdAt)
  const currTime = new Date(props.message.createdAt)
  const diffMinutes = (currTime - prevTime) / (1000 * 60)
  
  return diffMinutes > 5
})

const canEdit = computed(() => props.message.senderId === props.currentUserId)
const canDelete = computed(() => props.message.senderId === props.currentUserId)

const getUserInitials = (username) => {
  return username
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString()
  
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  if (isToday) return `Today at ${time}`
  if (isYesterday) return `Yesterday at ${time}`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }) + ` at ${time}`
}

const formatTimeShort = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: false 
  })
}

const handleSave = (content) => {
  emit('edit', { messageId: props.message.id, content })
  isEditing.value = false
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this message?')) {
    emit('delete', props.message.id)
  }
}
</script>

<style scoped>
.bg-gray-750\/50 {
  background-color: rgba(55, 57, 63, 0.5);
}

.message-content {
  position: relative;
}
</style>