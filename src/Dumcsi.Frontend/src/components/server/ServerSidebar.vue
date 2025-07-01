<template>
  <div class="w-[72px] bg-gray-950 flex flex-col items-center py-3 space-y-2 scrollbar-thin overflow-y-auto">
    <!-- Home/Direct Messages -->
    <RouterLink
      to="/servers"
      class="server-icon group"
      :class="{ 'active': isHome }"
    >
      <Home class="w-6 h-6" />
      <span class="server-tooltip">Home</span>
    </RouterLink>
    
    <div class="w-8 h-[2px] bg-gray-700 rounded-full" />
    
    <!-- Server List -->
    <div class="space-y-2">
      <RouterLink
        v-for="server in appStore.servers"
        :key="server.id"
        :to="`/servers/${server.id}`"
        class="server-icon group"
        :class="{ 'active': currentServerId === server.id }"
      >
        <img
          v-if="server.iconUrl"
          :src="server.iconUrl"
          :alt="server.name"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-lg font-semibold">
          {{ getServerInitials(server.name) }}
        </span>
        <span class="server-tooltip">{{ server.name }}</span>
      </RouterLink>
    </div>
    
    <!-- Add Server Button -->
    <button
      @click="showCreateModal = true"
      class="server-icon group bg-gray-700 hover:bg-accent text-gray-400 hover:text-white"
    >
      <Plus class="w-6 h-6" />
      <span class="server-tooltip">Add a Server</span>
    </button>
    
    <!-- Create/Join Server Modal -->
    <CreateServerModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Home, Plus } from 'lucide-vue-next'
import CreateServerModal from '@/components/server/CreateServerModal.vue'

const route = useRoute()
const appStore = useAppStore()

const showCreateModal = ref(false)

const isHome = computed(() => route.name === 'ServerSelect')
const currentServerId = computed(() => 
  route.params.serverId ? parseInt(route.params.serverId) : null
)

const getServerInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<style scoped lang="postcss">
.server-icon {
  @apply relative w-12 h-12 rounded-[24px] flex items-center justify-center
         bg-gray-700 text-gray-400 transition-all duration-200
         hover:rounded-[16px] hover:bg-primary hover:text-white
         cursor-pointer overflow-hidden;
}

.server-icon.active {
  @apply rounded-[16px] bg-primary text-white;
}

.server-tooltip {
  @apply absolute left-full ml-4 px-3 py-2 bg-gray-950 text-white text-sm
         rounded-lg opacity-0 pointer-events-none transition-opacity
         whitespace-nowrap z-50;
}

.group:hover .server-tooltip {
  @apply opacity-100;
}
</style>