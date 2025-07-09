<template>
  <div class="flex-1 flex items-center justify-center bg-discord-gray-700">
    <div class="text-center max-w-md">
      <div class="mb-8">
        <MessageSquare class="w-16 h-16 text-discord-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-white mb-2">
          Welcome to Dumcsi!
        </h1>
        <p class="text-discord-gray-400">
          Select a server from the sidebar to start chatting, or create a new one.
        </p>
      </div>
      
      <div v-if="servers.length === 0" class="space-y-4">
        <BaseButton @click="showCreateModal = true">
          Create Your First Server
        </BaseButton>
        
        <div class="text-sm text-discord-gray-400">
          or join a server with an invite link
        </div>
      </div>
      
      <div v-else class="space-y-4">
        <h2 class="text-lg font-semibold text-white">Your Servers</h2>
        <div class="grid gap-3">
          <button
            v-for="server in servers"
            :key="server.id"
            class="p-4 bg-discord-gray-600 hover:bg-discord-gray-500 rounded-lg transition-colors text-left"
            @click="navigateToServer(server.id)"
          >
            <div class="flex items-center space-x-3">
              <div v-if="server.icon" class="w-12 h-12 rounded-full overflow-hidden">
                <img :src="server.icon" :alt="server.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-12 h-12 bg-discord-blurple rounded-full flex items-center justify-center">
                <span class="text-white font-semibold">{{ server.name.charAt(0) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-white truncate">{{ server.name }}</h3>
                <p class="text-sm text-discord-gray-400">{{ server.memberCount }} members</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Create Server Modal -->
    <CreateServerModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handleServerCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessageSquare } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/common/BaseButton.vue'
import CreateServerModal from '@/components/modals/CreateServerModal.vue'
import type { EntityId, ServerDetailDto } from '@/types'

const router = useRouter()
const appStore = useAppStore()
const { addToast } = useToast()

const showCreateModal = ref(false)

const servers = computed(() => appStore.servers)

const navigateToServer = (serverId: EntityId) => {
  router.push(`/app/servers/${serverId}`)
}

const handleServerCreated = (server: ServerDetailDto) => {
  showCreateModal.value = false
  navigateToServer(server.id)
  addToast({
    type: 'success',
    message: `Server "${server.name}" created successfully!`
  })
}
</script>