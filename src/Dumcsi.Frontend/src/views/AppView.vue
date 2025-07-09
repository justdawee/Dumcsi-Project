<template>
  <div class="flex h-screen bg-discord-gray-900">
    <!-- Server List -->
    <div class="w-18 bg-discord-gray-800 flex flex-col items-center py-3 space-y-2">
      <button
        class="w-12 h-12 bg-discord-gray-700 hover:bg-discord-blurple rounded-full flex items-center justify-center transition-all duration-150 server-hover"
        @click="$router.push('/app')"
      >
        <Home class="w-6 h-6 text-white" />
      </button>
      
      <div class="w-8 h-0.5 bg-discord-gray-600 rounded-full"></div>
      
      <div v-for="server in servers" :key="server.id" class="relative">
        <button
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 server-hover',
            currentServerId === server.id ? 'bg-discord-blurple rounded-2xl' : 'bg-discord-gray-700'
          ]"
          @click="navigateToServer(server.id)"
        >
          <img
            v-if="server.icon"
            :src="server.icon"
            :alt="server.name"
            class="w-full h-full rounded-full object-cover"
          />
          <span v-else class="text-white font-medium text-sm">
            {{ server.name.charAt(0).toUpperCase() }}
          </span>
        </button>
        
        <div
          v-if="currentServerId === server.id"
          class="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full -ml-1"
        ></div>
      </div>
      
      <button
        class="w-12 h-12 bg-discord-gray-700 hover:bg-discord-green rounded-full flex items-center justify-center transition-all duration-150 server-hover"
        @click="showCreateServerModal = true"
      >
        <Plus class="w-6 h-6 text-white" />
      </button>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex">
      <router-view />
    </div>

    <!-- Create Server Modal -->
    <CreateServerModal
      v-if="showCreateServerModal"
      @close="showCreateServerModal = false"
      @created="handleServerCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Plus } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import CreateServerModal from '@/components/modals/CreateServerModal.vue'
import type { EntityId, ServerDetailDto } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const { addToast } = useToast()

const showCreateServerModal = ref(false)

const servers = computed(() => appStore.servers)
const currentServerId = computed(() => {
  const serverId = route.params.serverId
  return serverId ? parseInt(serverId as string, 10) : null
})

const navigateToServer = (serverId: EntityId) => {
  router.push(`/app/servers/${serverId}`)
}

const handleServerCreated = (server: ServerDetailDto) => {
  showCreateServerModal.value = false
  navigateToServer(server.id)
  addToast({
    type: 'success',
    message: `Server "${server.name}" created successfully!`
  })
}

onMounted(async () => {
  try {
    await appStore.fetchServers()
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to load servers'
    })
  }
})
</script>