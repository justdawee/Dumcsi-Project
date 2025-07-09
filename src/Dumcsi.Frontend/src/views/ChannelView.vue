<template>
  <div class="flex-1 flex flex-col bg-[var(--bg-primary)]">
    <!-- Channel header -->
    <div class="h-14 px-4 flex items-center justify-between border-b border-[var(--bg-hover)] flex-shrink-0">
      <div class="flex items-center gap-3">
        <Hash class="w-5 h-5 text-[var(--text-secondary)]" />
        <h3 class="text-lg font-semibold text-[var(--text-primary)]">{{ appStore.currentChannel?.name }}</h3>
        <span v-if="appStore.currentChannel?.description" class="text-sm text-[var(--text-secondary)] hidden md:block">
          {{ appStore.currentChannel.description }}
        </span>
      </div>
      
      <div class="flex items-center gap-2">
        <button class="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
          <Search class="w-5 h-5" />
        </button>
        <button
          @click="showMemberList = !showMemberList"
          :class="[
            'p-2 rounded-lg transition-colors text-[var(--text-secondary)]',
            showMemberList ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'hover:bg-[var(--bg-hover)]'
          ]"
        >
          <Users class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Messages area -->
      <div class="flex-1 flex flex-col">
        <!-- Messages list -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto custom-scrollbar px-4 py-4"
          @scroll="handleScroll"
        >
          <div v-if="isLoadingMessages" class="flex justify-center py-4">
            <Loader2 class="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
          </div>
          
          <div v-else-if="appStore.currentChannelMessages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
            <div class="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-4">
              <Hash class="w-10 h-10 text-[var(--text-secondary)]" />
            </div>
            <h3 class="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Welcome to #{{ appStore.currentChannel?.name }}!
            </h3>
            <p class="text-[var(--text-secondary)] max-w-md">
              This is the beginning of the #{{ appStore.currentChannel?.name }} channel.
              <span v-if="appStore.currentChannel?.description" class="block mt-2">
                {{ appStore.currentChannel.description }}
              </span>
            </p>
          </div>
          
          <div v-else class="space-y-4">
            <MessageGroup
              v-for="(group, index) in messageGroups"
              :key="group[0].id"
              :messages="group"
              :showDate="shouldShowDate(index)"
              @edit="handleEditMessage"
              @delete="handleDeleteMessage"
              @reply="handleReplyMessage"
            />
          </div>
        </div>

        <!-- Typing indicators -->
        <div v-if="appStore.currentChannelTypingUsers.length > 0" class="px-4 py-2 text-sm text-[var(--text-secondary)]">
          <span class="inline-flex items-center gap-1">
            <span class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce" style="animation-delay: 150ms"></span>
              <span class="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce" style="animation-delay: 300ms"></span>
            </span>
            {{ typingText }}
          </span>
        </div>

        <!-- Message input -->
        <MessageInput
          :channel="appStore.currentChannel!"
          :replyTo="replyingTo"
          @cancelReply="replyingTo = null"
        />
      </div>

      <!-- Member list sidebar -->
      <Transition name="slide-right">
        <ServerMemberList v-if="showMemberList" />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Hash, Search, Users, Loader2 } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import MessageGroup from '@/components/channel/MessageGroup.vue'
import MessageInput from '@/components/channel/MessageInput.vue'
import ServerMemberList from '@/components/server/ServerMemberList.vue'
import type { Message } from '@/types'

const appStore = useAppStore()

const messagesContainer = ref<HTMLElement>()
const showMemberList = ref(true)
const isLoadingMessages = ref(false)
const replyingTo = ref<Message | null>(null)

const messageGroups = computed(() => {
  const groups: Message[][] = []
  let currentGroup: Message[] = []
  let lastAuthorId: string | null = null
  let lastTimestamp = 0

  appStore.currentChannelMessages.forEach(message => {
    const messageTime = new Date(message.createdAt).getTime()
    const timeDiff = messageTime - lastTimestamp
    
    // Group messages by same author within 5 minutes
    if (message.authorId === lastAuthorId && timeDiff < 5 * 60 * 1000) {
      currentGroup.push(message)
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [message]
      lastAuthorId = message.authorId
    }
    
    lastTimestamp = messageTime
  })

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
})

const typingText = computed(() => {
  const users = appStore.currentChannelTypingUsers
  if (users.length === 1) {
    return `${users[0].username} is typing...`
  } else if (users.length === 2) {
    return `${users[0].username} and ${users[1].username} are typing...`
  } else if (users.length > 2) {
    return `${users[0].username} and ${users.length - 1} others are typing...`
  }
  return ''
})

function shouldShowDate(index: number): boolean {
  if (index === 0) return true
  
  const currentGroup = messageGroups.value[index]
  const previousGroup = messageGroups.value[index - 1]
  
  const currentDate = new Date(currentGroup[0].createdAt).toDateString()
  const previousDate = new Date(previousGroup[previousGroup.length - 1].createdAt).toDateString()
  
  return currentDate !== previousDate
}

function handleScroll() {
  // Implement infinite scroll for loading older messages
  if (!messagesContainer.value || isLoadingMessages.value) return
  
  const { scrollTop } = messagesContainer.value
  if (scrollTop === 0) {
    // Load more messages when scrolled to top
    // TODO: Implement pagination
  }
}

function handleEditMessage(message: Message) {
  // TODO: Implement message editing
  console.log('Edit message:', message)
}

function handleDeleteMessage(message: Message) {
  if (confirm('Are you sure you want to delete this message?')) {
    appStore.deleteMessage(message.id)
  }
}

function handleReplyMessage(message: Message) {
  replyingTo.value = message
}

// Auto-scroll to bottom when new messages arrive
watch(() => appStore.currentChannelMessages.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

// Scroll to bottom on channel change
watch(() => appStore.currentChannel?.id, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.2s ease;
}

.slide-right-enter-from {
  transform: translateX(100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}
</style>