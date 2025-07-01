<template>
  <div class="flex-1 flex flex-col bg-gray-800">
    <!-- Channel Header -->
    <div class="px-6 py-3 border-b border-gray-700 flex items-center justify-between shadow-xs">
      <div class="flex items-center gap-2">
        <Hash class="w-5 h-5 text-gray-400" />
        <h3 class="font-semibold text-white">{{ currentChannel?.name }}</h3>
        <span v-if="currentChannel?.description" class="text-sm text-gray-400 ml-2">
          {{ currentChannel.description }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-2 hover:bg-gray-700 rounded-sm transition">
          <Search class="w-5 h-5 text-gray-400" />
        </button>
        <button class="p-2 hover:bg-gray-700 rounded-sm transition">
          <Users class="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
    
    <!-- Messages Area -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4"
      @scroll="handleScroll"
    >
      <!-- Loading Messages -->
      <div v-if="appStore.loading.messages" class="flex justify-center py-4">
        <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
      </div>
      
      <!-- Load More Button -->
      <div v-if="hasMoreMessages && !appStore.loading.messages && messages.length > 0" class="text-center">
        <button
          @click="loadMoreMessages"
          class="text-sm text-primary hover:text-primary-hover transition"
        >
          Load more messages
        </button>
      </div>
      
      <!-- Messages -->
      <MessageItem
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :previous-message="messages[index - 1]"
        :current-user-id="authStore.user?.id"
        @edit="handleEditMessage"
        @delete="handleDeleteMessage"
      />
      
      <!-- Empty State -->
      <div v-if="!appStore.loading.messages && messages.length === 0" class="text-center py-8">
        <p class="text-gray-400">No messages yet. Start the conversation!</p>
      </div>
    </div>
    
    <!-- Message Input -->
    <div class="px-4 pb-4">
      <MessageInput
        :channel-name="currentChannel?.name"
        @send="handleSendMessage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { Hash, Search, Users, Loader2 } from 'lucide-vue-next'
import MessageItem from '@/components/message/MessageItem.vue'
import MessageInput from '@/components/message/MessageInput.vue'
import messageService from '@/services/messageService'

const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const messagesContainer = ref(null)
const hasMoreMessages = ref(true)

const currentChannel = computed(() => appStore.currentChannel)
const messages = computed(() => appStore.messages)

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const loadChannel = async (channelId) => {
  hasMoreMessages.value = true
  await appStore.fetchChannel(channelId)
  await scrollToBottom()
}

const loadMoreMessages = async () => {
  if (messages.value.length === 0) return
  
  const oldestMessage = messages.value[0]
  const oldScrollHeight = messagesContainer.value.scrollHeight
  
  await appStore.fetchMessages(currentChannel.value.id, oldestMessage.id)
  
  // Maintain scroll position
  await nextTick()
  const newScrollHeight = messagesContainer.value.scrollHeight
  messagesContainer.value.scrollTop = newScrollHeight - oldScrollHeight
  
  // Check if we got fewer messages than expected
  if (appStore.messages.length < messages.value.length + 50) {
    hasMoreMessages.value = false
  }
}

const handleScroll = () => {
  // Auto-load more when scrolling near top
  if (messagesContainer.value.scrollTop < 100 && hasMoreMessages.value && !appStore.loading.messages) {
    loadMoreMessages()
  }
}

const handleSendMessage = async (content) => {
  try {
    await appStore.sendMessage(currentChannel.value.id, { content });
    await scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

const handleEditMessage = async ({ messageId, content }) => {
  try {
    await messageService.editMessage(currentChannel.value.id, messageId, content)
    // Update the message in the store
    const messageIndex = messages.value.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      messages.value[messageIndex].content = content
      messages.value[messageIndex].isEdited = true
    }
  } catch (error) {
    console.error('Failed to edit message:', error)
  }
}

const handleDeleteMessage = async (messageId) => {
  try {
    await messageService.deleteMessage(currentChannel.value.id, messageId)
    // Remove the message from the store
    const messageIndex = messages.value.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      messages.value.splice(messageIndex, 1)
    }
  } catch (error) {
    console.error('Failed to delete message:', error)
  }
}

onMounted(() => {
  if (route.params.channelId) {
    loadChannel(parseInt(route.params.channelId))
  }
})

watch(() => route.params.channelId, (newChannelId) => {
  if (newChannelId) {
    loadChannel(parseInt(newChannelId))
  }
})

watch(() => route.params.channelId, (newChannelId) => {
  console.log('ChannelView watcher triggered:', newChannelId); // <-- Add hozzá ezt
  if (newChannelId) {
    loadChannel(parseInt(newChannelId))
  }
})
</script>