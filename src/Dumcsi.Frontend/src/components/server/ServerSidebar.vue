<template>
  <div class="w-[72px] bg-gray-950 flex flex-col items-center py-3 space-y-2 scrollbar-thin overflow-y-auto">
    <!-- Home/Direct Messages -->
    <RouterLink
      to="/servers"
      class="server-icon group"
      :class="{ 'active': isHome }"
      @mouseenter="showTooltip($event, 'Home')"
      @mouseleave="hideTooltip"
    >
      <Home class="w-6 h-6" />
    </RouterLink>

    <div class="w-8 h-[2px] bg-gray-700 rounded-full" />
    
    <!-- Server List -->
    <div class="space-y-2">
      <RouterLink
      v-for="server in appStore.servers"
      :key="server.id"
      :to="`/servers/${server.id}`"
      class="server-icon group mx-auto"
      :class="{ 'active': currentServerId === server.id }"
      @contextmenu.prevent="openServerMenu($event, server)"
      @mouseenter="showTooltip($event, server.name)"
      @mouseleave="hideTooltip"
    >
      <ServerAvatar
        :icon-url="server.iconUrl"
        :server-name="server.name"
      />
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
    <!-- Tooltip -->
     <Teleport to="body">
      <div
        v-if="tooltipVisible"
        :class="['fixed left-[84px] -translate-y-1/2 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap z-50 transition-opacity', tooltipVisible ? 'opacity-100' : 'opacity-0']"
        :style="{ top: `${tooltipTop}px` }"
      >
        {{ tooltipText }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { Home, Plus, UserPlus, PlusCircle, Edit, LogOut } from 'lucide-vue-next';
import type { Component } from 'vue';
import CreateServerModal from './CreateServerModal.vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ServerAvatar from '@/components/common/ServerAvatar.vue'; 
import type { ServerListItem } from '@/services/types';

interface MenuItem {
  label: string;
  icon: Component;
  action: () => void;
  danger?: boolean;
}

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const serverContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const serverMenuItems = ref<MenuItem[]>([]);
const showCreateModal = ref(false);

const tooltipText = ref('');
const tooltipTop = ref(0);
const tooltipVisible = ref(false);

const isHome = computed(() => route.name === 'ServerSelect');
const currentServerId = computed(() => 
  route.params.serverId ? parseInt(route.params.serverId as string) : null
);

const showTooltip = (e: MouseEvent, text: string) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  tooltipTop.value = rect.top + rect.height / 2; // Vertikálisan középre igazítjuk
  tooltipText.value = text;
  tooltipVisible.value = true;
};

const hideTooltip = () => {
  tooltipVisible.value = false;
};

const openServerMenu = (event: MouseEvent, server: ServerListItem) => {
  serverMenuItems.value = [
    { label: 'Invite', icon: UserPlus, action: () => console.log('Invite to', server.name) },
    { label: 'Create Channel', icon: PlusCircle, action: () => console.log('Create channel in', server.name) },
    { label: 'Modify Server', icon: Edit, action: () => console.log('Modify', server.name) },
    { label: 'Leave Server', icon: LogOut, danger: true, action: () => handleLeaveServer(server.id) },
  ];
  serverContextMenu.value?.open(event);
};

const handleLeaveServer = async (serverId: number) => {
  if (confirm('Are you sure you want to leave this server?')) {
    await appStore.leaveServer(serverId);
    if (currentServerId.value === serverId) {
        router.push({ name: 'ServerSelect' });
    }
  }
};
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
         whitespace-nowrap z-50 group-hover:opacity-100;
}
</style>