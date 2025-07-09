<template>
  <div class="flex flex-col flex-1 bg-discord-gray-700">
    <!-- Channel Header -->
    <div class="px-4 py-3 border-b border-discord-gray-600 flex items-center">
      <Hash class="w-5 h-5 text-discord-gray-400 mr-2" />
      <h2 class="text-white font-semibold">{{ currentChannel?.name }}</h2>
      <div class="flex-1"></div>
      <button
        v-if="currentChannelTypingUsers.length > 0"
        class="text-discord-gray-400 text-sm"
      >
        {{ typingText }}
      </button>
    </div>

    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      @scroll="debouncedScrollHandler"
    >
      <div v-if="loading.messages" class="flex justify-center">
        <Loader2 class="w-6 h-6 animate-spin text-discord-gray-400" />
      </div>
      
      <MessageItem
        v-for="message in sortedMessages"
        :key="message.id"
        :message="message"
        @edit="handleEditMessage"
        @delete="handleDeleteMessage"
      />
      
      <div v-if="sortedMessages.length === 0 && !loading.messages" class="text-center text-discord-gray-400 py-8">
        No messages yet. Start the conversation!
      </div>
    </div>

    <!-- Message Input -->
    <div class="p-4">
      <MessageInput
        v-if="canSendMessages"
        :channel-id="currentChannel?.id"
        @send="handleSendMessage"
      />
      <div v-else class="text-center text-discord-gray-400 py-4">
        You don't have permission to send messages in this channel.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Hash, Loader2 } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import MessageItem from '@/components/channel/MessageItem.vue'
import MessageInput from '@/components/channel/MessageInput.vue'
import { Permission, type CreateMessageRequestDto, type UpdateMessageRequestDto, type EntityId } from '@/types'

const route = useRoute()
const appStore = useAppStore()
const { addToast } = useToast()

const messagesContainer = ref<HTMLElement>()

const currentChannel = computed(() => appStore.currentChannel)
const sortedMessages = computed(() => appStore.sortedMessages)
const currentChannelTypingUsers = computed(() => appStore.currentChannelTypingUsers)
const loading = computed(() => appStore.loading)

const canSendMessages = computed(() => {
  if (!appStore.currentServer) return false
  return (appStore.currentServer.currentUserPermissions & Permission.SendMessages) !== 0
})

const typingText = computed(() => {
  const users = currentChannelTypingUsers.value
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0]?.username} is typing...`
  if (users.length === 2) return `${users[0]?.username} and ${users[1]?.username} are typing...`
  return `${users[0]?.username} and ${users.length - 1} others are typing...`
})

const scrollToBottom = async (behavior: 'smooth' | 'auto' = 'auto') => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior,
    })
  }
}

const loadChannelData = async (channelId: EntityId) => {
  await appStore.fetchChannel(channelId)
  await appStore.fetchMessages(channelId)
  await scrollToBottom()
}

const loadMoreMessages = async () => {
  if (!currentChannel.value || loading.value.messages || sortedMessages.value.length === 0) return

  const oldestMessageId = sortedMessages.value[0].id
  const oldScrollHeight = messagesContainer.value?.scrollHeight ?? 0

  await appStore.fetchMoreMessages(currentChannel.value.id, oldestMessageId)

  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight - oldScrollHeight
  }
}

const debouncedScrollHandler = (() => {
  let timeoutId: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      if (messagesContainer.value && messagesContainer.value.scrollTop < 100) {
        loadMoreMessages()
      }
    }, 200)
  }
})()

const handleSendMessage = async (payload: CreateMessageRequestDto) => {
  if (!currentChannel.value) return
  try {
    await appStore.sendMessage(currentChannel.value.id, payload)
    await scrollToBottom('smooth')
  } catch {
    addToast({ type: 'danger', message: 'Failed to send message.' })
  }
}

const handleEditMessage = (payload: { messageId: EntityId; content: UpdateMessageRequestDto }) => {
  appStore.editMessage(currentChannel.value!.id, payload.messageId, payload.content)
    .catch(() => addToast({ type: 'danger', message: 'Failed to edit message.' }))
}

const handleDeleteMessage = (messageId: EntityId) => {
  appStore.deleteMessage(currentChannel.value!.id, messageId)
    .catch(() => addToast({ type: 'danger', message: 'Failed to delete message.' }))
}

onMounted(() => {
  const channelId = parseInt(route.params.channelId as string, 10)
  if (channelId) {
    loadChannelData(channelId)
  }
})

watch(() => route.params.channelId, (newId) => {
  const newChannelId = newId ? parseInt(newId as string, 10) : null
  if (newChannelId && newChannelId !== currentChannel.value?.id) {
    loadChannelData(newChannelId)
  }
}, { immediate: true })
</script>