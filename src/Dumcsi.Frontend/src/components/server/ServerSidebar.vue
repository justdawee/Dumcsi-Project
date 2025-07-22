<template>
  <div class="w-[72px] bg-main-950 flex flex-col items-center py-3 space-y-2">
    <!-- Home/Direct Messages -->
    <div
        class="relative group w-full px-3"
        @mouseenter="showTooltip($event, 'Home')"
        @mouseleave="hideTooltip"
    >
      <div
          :class="isHome ? 'h-10' : 'scale-y-0 group-hover:h-5 group-hover:scale-y-100'"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-text-default rounded-r-lg transition-all duration-200 origin-center h-2"
      ></div>
      <RouterLink
          :class="{ 'active': isHome }"
          class="server-icon"
          to="/servers"
      >
        <Home class="w-6 h-6"/>
      </RouterLink>
    </div>

    <div class="w-8 h-[2px] bg-border-default rounded-full"/>

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
            :class="currentServerId === server.id ? 'h-10' : 'scale-y-0 group-hover:h-5 group-hover:scale-y-100'"
            class="absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-text-default rounded-r-lg transition-all duration-200 origin-center h-2"
        ></div>

        <RouterLink
            :class="{ 'active': currentServerId === server.id }"
            :to="`/servers/${server.id}`"
            class="server-icon"
        >
          <ServerAvatar
              :icon="server.icon"
              :server-id="server.id"
              :server-name="server.name"
          />
        </RouterLink>
      </div>

      <!-- Add Server Button -->
      <div
          class="relative group"
          @mouseenter="showTooltip($event, 'Add a Server')"
          @mouseleave="hideTooltip"
      >
        <button
            class="server-icon"
            @click="showCreateModal = true"
        >
          <Plus class="w-6 h-6"/>
        </button>
      </div>
      <!-- Public Server List -->
      <div class="relative group"
           @mouseenter="showTooltip($event, 'Explore Servers')"
           @mouseleave="hideTooltip"
      >
        <button
            class="server-icon bg-main-700 hover:bg-accent text-text-muted hover:text-text-default mx-auto"
            @click="isExploreModalOpen = true"
        >
          <Compass class="w-6 h-6"/>
        </button>
      </div>
    </div>
    <!-- ContextMenu és a hozzá tartozó modális ablakok -->
    <ContextMenu ref="serverContextMenu" :items="serverMenuItems"/>

    <CreateServerModal
        v-if="showCreateModal"
        @close="showCreateModal = false"
    />

    <ExploreServersModal
        v-if="isExploreModalOpen"
        v-model="isExploreModalOpen"
    />

    <InviteModal
        v-model="isInviteModalOpen"
        :invite-code="generatedInviteCode"
        :server="selectedServer"
    />

    <EditServerModal
        v-if="isEditServerModalOpen"
        v-model="isEditServerModalOpen"
        :server="selectedServer"
        @close="isEditServerModalOpen = false"
        @server-updated="appStore.fetchServers()"
    />

    <ManageRolesModal
        v-if="isManageRolesModalOpen"
        v-model="isManageRolesModalOpen"
        :server="selectedServer"
        @close="isManageRolesModalOpen = false"
    />

    <ConfirmModal
        v-model="isLeaveConfirmOpen"
        :is-loading="isLeaving"
        :message="`Are you sure you want to leave ${selectedServer?.name}? You won't be able to rejoin this server unless you are re-invited.`"
        :title="`Leave '${selectedServer?.name}'`"
        confirm-text="Leave Server"
        intent="danger"
        @confirm="confirmLeaveServer"
    />
    <Teleport to="body">
      <div
          v-if="tooltipVisible"
          :class="['fixed left-[72px] -translate-y-1/2 px-3 py-2 bg-bg-base text-text-default text-sm rounded-lg whitespace-nowrap z-50 transition-opacity', tooltipVisible ? 'opacity-100' : 'opacity-0']"
          :style="{ top: `${tooltipTop}px` }"
      >
        {{ tooltipText }}
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onUnmounted} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {Home, Plus, UserPlus, PlusCircle, Edit, LogOut, Compass, Shield} from 'lucide-vue-next';
import type {Component} from 'vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ServerAvatar from '@/components/common/ServerAvatar.vue';
import InviteModal from '@/components/modals/InviteModal.vue';
import EditServerModal from '@/components/modals/EditServerModal.vue';
import ExploreServersModal from '@/components/modals/ExploreServersModal.vue';
import CreateServerModal from './CreateServerModal.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import ManageRolesModal from '@/components/modals/ManageRolesModal.vue';
import {useToast} from '@/composables/useToast';
import serverService from '@/services/serverService';
import type {ServerListItem} from '@/services/types';
import { usePermissions } from '@/composables/usePermissions';

// --- State ---
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const {addToast} = useToast();
const { permissions } = usePermissions();

interface MenuItem {
  label: string;
  icon: Component;
  action: () => void;
  danger?: boolean;
}

const serverContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const serverMenuItems = ref<MenuItem[]>([]);
const selectedServer = ref<ServerListItem | null>(null);

const showCreateModal = ref(false);
const isInviteModalOpen = ref(false);
const generatedInviteCode = ref('');
const isManageRolesModalOpen = ref(false);
const isEditServerModalOpen = ref(false);
const isExploreModalOpen = ref(false);
const isLeaveConfirmOpen = ref(false);
const isLeaving = ref(false);

const tooltipText = ref('');
const tooltipTop = ref(0);
const tooltipVisible = ref(false);
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

// --- Computed ---
const isHome = computed(() => route.name === 'ServerSelect');
const currentServerId = computed(() => route.params.serverId ? parseInt(route.params.serverId as string) : null);

// --- Methods ---
const handleInvite = async (server: ServerListItem) => {
  try {
    const response = await serverService.generateInvite(server.id);
    selectedServer.value = server;
    generatedInviteCode.value = response.code;
    isInviteModalOpen.value = true;
  } catch (error) {
    addToast({
      message: 'Failed to generate invite code.',
      type: 'danger'
    });
  }
};

const handleCreateChannel = (server: ServerListItem) => {
  if (currentServerId.value !== server.id) {
    router.push({name: 'Server', params: {serverId: server.id}});
  }
  appStore.openCreateChannelModal(server.id);
};

const handleEditServer = (server: ServerListItem) => {
  selectedServer.value = server;
  isEditServerModalOpen.value = true;
};

const handleLeaveServer = (server: ServerListItem) => {
  selectedServer.value = server;
  isLeaveConfirmOpen.value = true;
};

const handleManageRoles = (server: ServerListItem) => {
  selectedServer.value = server;
  isManageRolesModalOpen.value = true;
};

const confirmLeaveServer = async () => {
  if (!selectedServer.value) return;

  isLeaving.value = true;
  const serverToLeave = selectedServer.value;

  try {
    await appStore.leaveServer(serverToLeave.id);
    addToast({
      message: `You have successfully left ${serverToLeave.name}.`,
      type: 'success',
      title: 'Server Left'
    });
    if (currentServerId.value === serverToLeave.id) {
      router.push({name: 'ServerSelect'});
    }
    appStore.fetchServers();
  } catch (error: any) {
    addToast({
      message: 'Server owner cannot leave the server.',
      type: 'danger',
      title: 'Leave Failed'
    });
  } finally {
    isLeaving.value = false;
    isLeaveConfirmOpen.value = false;
    selectedServer.value = null;
  }
};

const openServerMenu = (event: MouseEvent, server: ServerListItem) => {
  const menuItems: MenuItem[] = [];
  const isCurrentServer = server.id === currentServerId.value;

  const canInvite = isCurrentServer ? permissions.createInvite.value : server.isOwner;
  const canManageChannels = isCurrentServer ? permissions.manageChannels.value : server.isOwner;
  const canManageServer = isCurrentServer ? permissions.manageServer.value : server.isOwner;
  const canManageRoles = isCurrentServer ? permissions.manageRoles.value : server.isOwner;

  if (canInvite) {
    menuItems.push({label: 'Invite', icon: UserPlus, action: () => handleInvite(server)});
  }
  if (canManageChannels) {
    menuItems.push({label: 'Create Channel', icon: PlusCircle, action: () => handleCreateChannel(server)});
  }
  if (canManageServer) {
    menuItems.push({label: 'Modify Server', icon: Edit, action: () => handleEditServer(server)});
  }

  if (canManageRoles) {
    menuItems.push({label: 'Manage Roles', icon: Shield, action: () => handleManageRoles(server)});
  }

  if (!server.isOwner) {
    menuItems.push({label: 'Leave Server', icon: LogOut, danger: true, action: () => handleLeaveServer(server)});
  }

  serverMenuItems.value = menuItems;
  if (menuItems.length > 0) {
    serverContextMenu.value?.open(event);
  }
};

const showTooltip = (e: MouseEvent, text: string) => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  tooltipTop.value = rect.top + rect.height / 2;
  tooltipText.value = text;

  tooltipTimeout = setTimeout(() => {
    tooltipVisible.value = true;
  }, 500);
};

const hideTooltip = () => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  tooltipVisible.value = false;
};

onUnmounted(() => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
});
</script>