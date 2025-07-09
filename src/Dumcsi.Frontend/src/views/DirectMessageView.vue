<template>
  <div class="flex-1 flex">
    <!-- DM list sidebar -->
    <div class="w-60 bg-[var(--bg-secondary)] flex flex-col">
      <div class="h-14 px-4 flex items-center border-b border-[var(--bg-hover)]">
        <h2 class="font-semibold text-[var(--text-primary)]">Direct Messages</h2>
      </div>

      <!-- Search -->
      <div class="p-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Find or start a conversation"
            class="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>
      </div>

      <!-- DM list -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
        <button
          v-for="dm in directMessages"
          :key="dm.id"
          @click="selectDM(dm.id)"
          :class="[
            'w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors mb-1',
            currentDMId === dm.id
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]/50 hover:text-[var(--text-primary)]'
          ]"
        >
          <UserAvatar :user="getOtherUser(dm)" :size="36" />
          
          <div class="flex-1 text-left min-w-0">
            <p class="font-medium truncate">{{ getOtherUser(dm).username }}</p>
            <p v-if="dm.lastMessage" class="text-xs text-[var(--text-secondary)] truncate">
              {{ dm.lastMessage.content }}
            </p>
          </div>

          <span v-if="dm.unreadCount > 0" class="bg-[var(--accent-secondary)] text-xs text-white px-1.5 py-0.5 rounded-full">
            {{ dm.unreadCount }}
          </span>
        </button>

        <!-- Empty state -->
        <div v-if="directMessages.length === 0" class="text-center py-8">
          <MessageSquare class="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-20" />
          <p class="text-sm text-[var(--text-secondary)]">No direct messages yet</p>
        </div>
      </div>
    </div>

    <!-- Message area -->
    <div v-if="currentDM" class="flex-1 flex flex-col bg-[var(--bg-primary)]">
      <!-- DM header -->
      <div class="h-14 px-4 flex items-center justify-between border-b border-[var(--bg-hover)]">
        <div class="flex items-center gap-3">
          <UserAvatar :user="getOtherUser(currentDM)" :size="32" />
          <div>
            <h3 class="font-semibold text-[var(--text-primary)]">
              {{ getOtherUser(currentDM).username }}
            </h3>
            <p class="text-xs text-[var(--text-secondary)]">
              {{ getOtherUser(currentDM).isOnline ? 'Online' : 'Offline' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
            <Phone class="w-5 h-5" />
          </button>
          <button class="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
            <Video class="w-5 h-5" />
          </button>
          <button class="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
            <MoreVertical class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div class="text-center py-8">
          <UserAvatar :user="getOtherUser(currentDM)" :size="80" :showOnlineStatus="false" />
          <h3 class="text-lg font-semibold text-[var(--text-primary)] mt-4">
            {{ getOtherUser(currentDM).username }}
          </h3>
          <p class="text-[var(--text-secondary)] mt-1">
            This is the beginning of your direct message history with {{ getOtherUser(currentDM).username }}
          </p>
        </div>
        
        <!-- Messages would go here -->
      </div>

      <!-- Message input -->
      <div class="px-4 pb-4">
        <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-md p-3">
          <div class="flex items-end gap-3">
            <button class="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
              <Paperclip class="w-5 h-5" />
            </button>
            
            <textarea
              v-model="message"
              @keydown.enter.prevent="sendMessage"
              :placeholder="`Message @${getOtherUser(currentDM).username}`"
              class="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none outline-none max-h-40"
              rows="1"
            />
            
            <button class="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
              <Smile class="w-5 h-5" />
            </button>
            
            <button
              @click="sendMessage"
              :disabled="!message.trim()"
              :class="[
                'p-2 rounded-xl transition-all',
                message.trim() 
                  ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90' 
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-not-allowed'
              ]"
            >
              <Send class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
      <div class="text-center">
        <MessageSquare class="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4 opacity-20" />
        <p class="text-[var(--text-secondary)]">Select a conversation to start messaging</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, MessageSquare, Phone, Video, MoreVertical, Paperclip, Smile, Send } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/common/UserAvatar.vue'
import type { DirectMessage, User } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const searchQuery = ref('')
const message = ref('')
const currentDMId = computed(() => route.params.dmId as string | undefined)

// Mock data - in real app, this would come from the store
const directMessages = ref<DirectMessage[]>([
  {
    id: '1',
    participants: [
      authStore.user!,
      {
        id: '2',
        username: 'JohnDoe',
        email: 'john@example.com',
        avatarUrl: null,
        status: 'Working on something cool',
        createdAt: '2024-01-01',
        lastSeenAt: '2024-01-15',
        isOnline: true
      }
    ],
    lastMessage: {
      id: '1',
      channelId: 'dm-1',
      authorId: '2',
      author: {} as User,
      content: 'Hey, how are you?',
      createdAt: new Date().toISOString(),
      isEdited: false,
      isPinned: false,
      mentions: []
    },
    unreadCount: 2
  }
])

const currentDM = computed(() => {
  return directMessages.value.find(dm => dm.id === currentDMId.value)
})

function getOtherUser(dm: DirectMessage): User {
  return dm.participants.find(u => u.id !== authStore.user?.id) || dm.participants[0]
}

function selectDM(dmId: string) {
  router.push(`/dms/${dmId}`)
}

function sendMessage() {
  if (!message.value.trim()) return
  
  // TODO: Implement DM sending
  console.log('Send DM:', message.value)
  message.value = ''
}
</script>