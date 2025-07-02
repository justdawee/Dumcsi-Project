<template>
  <div class="w-[72px] bg-gray-950 flex flex-col items-center py-3 space-y-2">
    <!-- Home/Direct Messages -->
    <div 
      class="relative group w-full px-3"
      @mouseenter="showTooltip($event, 'Home')"
      @mouseleave="hideTooltip"
    >
      <div 
        class="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-lg transition-all duration-200 origin-center h-2" 
        :class="isHome ? 'h-10' : 'scale-y-0 group-hover:h-5 group-hover:scale-y-100'"
      ></div>
      <RouterLink
        to="/servers"
        class="server-icon"
        :class="{ 'active': isHome }"
      >
        <Home class="w-6 h-6" />
      </RouterLink>
    </div>

    <div class="w-8 h-[2px] bg-gray-700 rounded-full" />
    
    <!-- Server List & Add Button Container -->
    <div class="flex-1 space-y-2 w-full overflow-y-auto scrollbar-thin px-3">
      <!-- Server List -->
      <div
        v-for="server in appStore.servers"
        :key="server.id"
        class="relative group"
        @mouseenter="showTooltip($event, server.name)"
        @mouseleave="hideTooltip"
        @contextmenu.prevent="openServerMenu($event, server)"
      >
        <div 
          class="absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-lg transition-all duration-200 origin-center h-2"
          :class="currentServerId === server.id ? 'h-10' : 'scale-y-0 group-hover:h-5 group-hover:scale-y-100'"
        ></div>
        
        <RouterLink
          :to="`/servers/${server.id}`"
          class="server-icon"
          :class="{ 'active': currentServerId === server.id }"
        >
          <ServerAvatar
            :icon-url="server.iconUrl"
            :server-name="server.name"
          />
        </RouterLink>
      </div>

      <div 
        class="relative group"
        @mouseenter="showTooltip($event, 'Add a Server')"
        @mouseleave="hideTooltip"
      >
        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-lg transition-all duration-200 origin-center h-2 scale-y-0 group-hover:h-5 group-hover:scale-y-100"></div>
        <button
          @click="showCreateModal = true"
          class="server-icon bg-gray-700 hover:bg-accent text-gray-400 hover:text-white"
        >
          <Plus class="w-6 h-6" />
        </button>
      </div>
    </div>
    <!-- ContextMenu és a hozzá tartozó modális ablakok -->
    <ContextMenu ref="serverContextMenu" :items="serverMenuItems" />
    
    <CreateServerModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
    
    <InviteModal
      v-model="isInviteModalOpen"
      :server="selectedServer"
      :invite-code="generatedInviteCode"
    />

    <EditServerModal
      v-if="isEditServerModalOpen"
      v-model="isEditServerModalOpen"
      :server="selectedServer"
      @close="isEditServerModalOpen = false"
      @server-updated="appStore.fetchServers()"
    />
    <Teleport to="body">
      <div
        v-if="tooltipVisible"
        :class="['fixed left-[72px] -translate-y-1/2 px-3 py-2 bg-gray-950 text-white text-sm rounded-lg whitespace-nowrap z-50 transition-opacity', tooltipVisible ? 'opacity-100' : 'opacity-0']"
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
import InviteModal from '@/components/modals/InviteModal.vue';
import EditServerModal from '@/components/modals/EditServerModal.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import serverService from '@/services/serverService';
import type { ServerListItem } from '@/services/types';

// --- State ---
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

interface MenuItem { label: string; icon: Component; action: () => void; danger?: boolean; }
const serverContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const serverMenuItems = ref<MenuItem[]>([]);
const selectedServer = ref<ServerListItem | null>(null);

const showCreateModal = ref(false);
const isInviteModalOpen = ref(false);
const generatedInviteCode = ref('');
const isEditServerModalOpen = ref(false);
const isLeaveConfirmOpen = ref(false);
const isLeaving = ref(false);

const tooltipText = ref('');
const tooltipTop = ref(0);
const tooltipVisible = ref(false);

// --- Computed ---
const isHome = computed(() => route.name === 'ServerSelect');
const currentServerId = computed(() => route.params.serverId ? parseInt(route.params.serverId as string) : null);

// --- Methods ---
const handleInvite = async (server: ServerListItem) => {
    try {
        const response = await serverService.generateInvite(server.id);
        selectedServer.value = server;
        generatedInviteCode.value = response.data.inviteCode;
        isInviteModalOpen.value = true;
    } catch (error) {
        console.error("Failed to generate invite:", error);
    }
};

const handleCreateChannel = (server: ServerListItem) => {
    // A ChannelSidebar-ban lévő '+' gomb nyitja meg a modális ablakot.
    // A kontextusmenüből való hívás egyelőre csak egy jelzés.
    // A logikát egy globális eseménykezelővel (pl. Pinia action) lehetne központosítani.
    console.log("Create channel in", server.name);
    alert("Please use the '+' button in the channel list to create a new channel.");
};

const handleEditServer = (server: ServerListItem) => {
    selectedServer.value = server;
    isEditServerModalOpen.value = true;
};

const handleLeaveServer = (server: ServerListItem) => {
    selectedServer.value = server;
    isLeaveConfirmOpen.value = true;
};

const confirmLeaveServer = async () => {
    if (!selectedServer.value) return;
    isLeaving.value = true;
    try {
        await appStore.leaveServer(selectedServer.value.id);
        if (currentServerId.value === selectedServer.value.id) {
            router.push({ name: 'ServerSelect' });
        }
    } finally {
        isLeaving.value = false;
        isLeaveConfirmOpen.value = false;
    }
};

const openServerMenu = (event: MouseEvent, server: ServerListItem) => {
  serverMenuItems.value = [
    { label: 'Invite', icon: UserPlus, action: () => handleInvite(server) },
    { label: 'Create Channel', icon: PlusCircle, action: () => handleCreateChannel(server) },
    { label: 'Modify Server', icon: Edit, action: () => handleEditServer(server) },
    { label: 'Leave Server', icon: LogOut, danger: true, action: () => handleLeaveServer(server) },
  ];
  serverContextMenu.value?.open(event);
};

const showTooltip = (e: MouseEvent, text: string) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  tooltipTop.value = rect.top + rect.height / 2;
  tooltipText.value = text;
  tooltipVisible.value = true;
};

const hideTooltip = () => {
  tooltipVisible.value = false;
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
</style>
