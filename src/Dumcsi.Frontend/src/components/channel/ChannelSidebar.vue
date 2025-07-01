<template>
  <div class="w-60 bg-gray-850 flex flex-col">
    <!-- Server Header -->
    <div class="px-4 py-3 border-b border-gray-700 shadow-xs">
      <h2 class="font-semibold text-white truncate">
        {{ server?.name || 'Loading...' }}
      </h2>
    </div>
    
    <!-- Channel List -->
    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <div v-if="loading" class="flex items-center justify-center py-8">
        <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
      </div>
      
      <div v-else class="py-2">
        <!-- Text Channels -->
        <div class="px-2 mb-2">
          <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
            <span>Text Channels</span>
            <button
              v-if="canManageChannels"
              @click="showCreateChannel = true"
              class="hover:text-gray-200 transition"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          
          <div class="space-y-0.5">
            <RouterLink
              v-for="channel in textChannels"
              :key="channel.id"
              :to="`/servers/${server.id}/channels/${channel.id}`"
              class="channel-item"
              :class="{ 'active': currentChannelId === channel.id }"
            >
              <Hash class="w-4 h-4 text-gray-400" />
              <span class="truncate">{{ channel.name }}</span>
            </RouterLink>
          </div>
        </div>
        
        <!-- Voice Channels (if any) -->
        <div v-if="voiceChannels.length > 0" class="px-2 mb-2">
          <div class="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
            Voice Channels
          </div>
          <div class="space-y-0.5">
            <button
              v-for="channel in voiceChannels"
              :key="channel.id"
              class="channel-item w-full text-left"
              disabled
            >
              <Volume2 class="w-4 h-4 text-gray-400" />
              <span class="truncate">{{ channel.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- User Panel -->
    <div class="px-2 py-2 bg-gray-900 border-t border-gray-700">
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-800 transition">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User class="w-4 h-4 text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ authStore.user?.username }}
          </p>
          <p class="text-xs text-gray-400">
            {{ server?.currentUserRole ? roleNames[server.currentUserRole] : 'Member' }}
          </p>
        </div>
        <Settings class="w-4 h-4 text-gray-400 hover:text-gray-200 cursor-pointer" />
      </div>
    </div>
    
    <!-- Create Channel Modal -->
    <CreateChannelModal
      v-if="showCreateChannel"
      :serverId="server?.id"
      @close="showCreateChannel = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Hash, Volume2, Plus, User, Settings, Loader2 } from 'lucide-vue-next'
import CreateChannelModal from './CreateChannelModal.vue'

const props = defineProps({
  server: Object,
  loading: Boolean
})

const route = useRoute()
const authStore = useAuthStore()

const showCreateChannel = ref(false)

const roleNames = {
  0: 'Member',
  1: 'Moderator',
  2: 'Admin'
}

const currentChannelId = computed(() => 
  route.params.channelId ? parseInt(route.params.channelId) : null
)

const textChannels = computed(() => 
  props.server?.channels?.filter(c => c.type === 0) || []
)

const voiceChannels = computed(() => 
  props.server?.channels?.filter(c => c.type === 1) || []
)

const canManageChannels = computed(() => 
  props.server?.currentUserRole > 0
)
</script>

<style scoped lang="postcss">
.bg-gray-850 {
  background-color: #2b2d31;
}

.channel-item {
  @apply flex items-center gap-2 px-2 py-1.5 rounded text-gray-400 
         hover:bg-gray-700 hover:text-gray-100 transition-colors cursor-pointer;
}

.channel-item.active {
  @apply bg-gray-700 text-white;
}

.channel-item:disabled {
  @apply opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-400;
}
</style>