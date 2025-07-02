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
        @contextmenu.prevent="openServerMenu($event, server)"
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
    <ContextMenu ref="serverContextMenu" :items="serverMenuItems" />
    
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
import { Home, Plus, UserPlus, PlusCircle, Edit, LogOut } from 'lucide-vue-next'
import CreateServerModal from './CreateServerModal.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'

const route = useRoute()
const appStore = useAppStore()

const serverContextMenu = ref(null);
const serverMenuItems = ref([]);

const showCreateModal = ref(false)

const isHome = computed(() => route.name === 'ServerSelect')
const currentServerId = computed(() => 
  route.params.serverId ? parseInt(route.params.serverId) : null
)

const openServerMenu = (event, server) => {
  serverMenuItems.value = [
    { label: 'Invite', icon: UserPlus, action: () => console.log('Invite to', server.name) },
    { label: 'Create Channel', icon: PlusCircle, action: () => console.log('Create channel in', server.name) },
    { label: 'Modify Server', icon: Edit, action: () => console.log('Modify', server.name) },
    { label: 'Leave Server', icon: LogOut, danger: true, action: () => handleLeaveServer(server.id) },
  ];
  serverContextMenu.value.open(event);
};

const handleLeaveServer = async (serverId) => {
  if (confirm('Are you sure you want to leave this server?')) {
    await appStore.leaveServer(serverId);
    route.path = '/servers';
  }
};

const getServerInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<style scoped>
@reference "@/style.css";

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