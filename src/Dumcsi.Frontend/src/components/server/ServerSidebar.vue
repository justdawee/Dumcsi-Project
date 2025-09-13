<template>
  <div 
    :class="[
      'w-[72px] bg-main-950 flex flex-col items-center py-3 space-y-2',
      appStore.currentVoiceChannelId ? 'h-183' : 'h-216'
    ]"
  >
    <!-- Home/Direct Messages -->
    <div
        class="relative group w-full px-3"
        @mouseenter="showTooltip($event, t('server.sidebar.tooltip.home'))"
        @mouseleave="hideTooltip"
    >
      <div
          :class="isHome ? 'h-10' : 'scale-y-0 group-hover:h-5 group-hover:scale-y-100'"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-text-default rounded-r-lg transition-all duration-200 origin-center h-2"
      ></div>
      <RouterLink
          :class="{ 'active': isHome }"
          class="server-icon"
          to="/friends"
      >
        <Home class="w-6 h-6"/>
      </RouterLink>
    </div>
    <div class="w-8 h-[2px] bg-border-default rounded-full"/>

    <!-- Server List Container -->
    <div class="flex-1 space-y-2 w-full overflow-y-auto px-3 pb-2 scrollbar-hidden">
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
          @mouseenter="showTooltip($event, t('server.sidebar.tooltip.addServer'))"
          @mouseleave="hideTooltip"
      >
        <button
            class="server-icon"
            @click="openCreateModal"
        >
          <Plus class="w-6 h-6"/>
        </button>
      </div>

      <!-- Explore Servers Button -->
      <div class="relative group flex-shrink-0"
           @mouseenter="showTooltip($event, t('server.sidebar.tooltip.explore'))"
           @mouseleave="hideTooltip"
      >
        <button
            class="server-icon bg-main-700 hover:bg-accent text-text-muted hover:text-text-default"
            @click="isExploreModalOpen = true"
        >
          <Compass class="w-6 h-6"/>
        </button>
      </div>
    </div>
    <!-- ContextMenu és a hozzá tartozó modális ablakok -->
    <ContextMenu ref="serverContextMenu" :items="currentServerMenuItems"/>

    <CreateServerModal
        v-model="showCreateModal"
        @close="closeCreateModal"
    />

    <ExploreServersModal
        v-if="isExploreModalOpen"
        v-model="isExploreModalOpen"
    />

    <InviteModal
        v-model="serverMenu.isInviteModalOpen.value"
        :invite-code="serverMenu.generatedInviteCode.value"
        :server="serverMenu.selectedServer.value"
        @invite-generated="handleInviteGenerated"
    />

    <InviteManagementModal
        ref="inviteManagementModal"
        v-model="serverMenu.isInviteManagementModalOpen.value"
        :server="serverMenu.selectedServer.value"
        @open-create-invite="handleOpenCreateInviteFromManagement"
    />

    <EditServerModal
        v-model="serverMenu.isEditServerModalOpen.value"
        :server="serverMenu.selectedServer.value"
        @close="serverMenu.isEditServerModalOpen.value = false"
        @server-updated="appStore.fetchServers()"
    />

    <ManageRolesModal
        v-model="serverMenu.isManageRolesModalOpen.value"
        :server="serverMenu.selectedServer.value"
        @close="serverMenu.isManageRolesModalOpen.value = false"
    />

    <BaseModal v-model="serverMenu.isCreateTopicModalOpen.value" :title="t('topics.createTitle')">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-default mb-2">{{ t('topics.nameLabel') }}</label>
          <input
              v-model="serverMenu.newTopicName.value"
              class="w-full px-3 py-2 form-input bg-main-800 border border-main-600 rounded-md text-text-default placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              :placeholder="t('topics.placeholder')"
              type="text"
              @keydown.enter="serverMenu.createTopic"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
              class="px-4 py-2 btn-secondary text-text-muted hover:text-text-default transition-colors"
              @click="serverMenu.isCreateTopicModalOpen.value = false"
          >
            {{ t('common.cancel') }}
          </button>
          <button
              :disabled="!serverMenu.newTopicName.value.trim()"
              class="px-4 py-2 btn-primary bg-primary hover:bg-primary/80 text-white rounded-md transition-colors disabled:opacity-50"
              @click="serverMenu.createTopic"
          >
            {{ t('topics.create') }}
          </button>
        </div>
      </template>
    </BaseModal>

    <ConfirmModal
        v-model="serverMenu.isLeaveConfirmOpen.value"
        :is-loading="serverMenu.isLeaving.value"
        :message="t('server.leave.confirmMessage', { name: serverMenu.selectedServer.value?.name ?? '' })"
        :title="t('server.leave.confirmTitle', { name: serverMenu.selectedServer.value?.name ?? '' })"
        :confirm-text="t('server.leave.confirmText')"
        intent="danger"
        @confirm="serverMenu.confirmLeaveServer"
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
import {useRoute} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {Home, Plus, Compass, BellOff, Bell} from 'lucide-vue-next';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ServerAvatar from '@/components/common/ServerAvatar.vue';
import InviteModal from '@/components/modals/InviteModal.vue';
import InviteManagementModal from '@/components/modals/InviteManagementModal.vue';
import EditServerModal from '@/components/modals/EditServerModal.vue';
import ExploreServersModal from '@/components/modals/ExploreServersModal.vue';
import CreateServerModal from './CreateServerModal.vue';
import BaseModal from '@/components/modals/BaseModal.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import ManageRolesModal from '@/components/modals/ManageRolesModal.vue';
import type {ServerListItem} from '@/services/types';
import {useServerMenu} from '@/composables/useServerMenu';
import {useNotificationPrefs} from '@/stores/notifications';
import type { MenuItem } from '@/components/ui/ContextMenu.vue';
import { useI18n } from 'vue-i18n';

// --- State ---
const route = useRoute();
const appStore = useAppStore();
const serverMenu = useServerMenu();
const { t } = useI18n();


const serverContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const showCreateModal = ref(false);
const isExploreModalOpen = ref(false);

const tooltipText = ref('');
const tooltipTop = ref(0);
const tooltipVisible = ref(false);
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

const openCreateModal = () => {
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const inviteManagementModal = ref();

const handleOpenCreateInviteFromManagement = () => {
  // Close the management modal and open the create invite modal
  serverMenu.isInviteManagementModalOpen.value = false;
  serverMenu.isInviteModalOpen.value = true;
  // Clear any existing invite code to generate a fresh one
  serverMenu.generatedInviteCode.value = '';
};

const handleInviteGenerated = (code: string) => {
  serverMenu.generatedInviteCode.value = code;
  // Refresh the management modal if it's open
  if (inviteManagementModal.value) {
    inviteManagementModal.value.refreshInvites();
  }
};

// --- Computed ---
const isHome = computed(() => route.name === 'Friends' || route.path === '/servers');
const currentServerId = computed(() => route.params.serverId ? parseInt(route.params.serverId as string) : null);

// --- Methods ---

// Current server menu items
const currentServerMenuItems = ref<any[]>([]);

const prefs = useNotificationPrefs();

const openServerMenu = (event: MouseEvent, server: ServerListItem) => {
  const menuItems = serverMenu.getServerMenuItems(server) as unknown as MenuItem[];
  // Append single Mute Server… item with hover submenu (or Unmute if already muted)
  const isMuted = prefs.isServerMuted(server.id);
  const augmented: MenuItem[] = [...menuItems, { type: 'separator' } as any];
  if (!isMuted) {
    augmented.push({ label: t('server.menu.muteServer'), icon: BellOff as any, children: [
      { label: t('server.menu.mute.for15m'), action: () => prefs.muteServer(server.id, prefs.Durations.m15) } as any,
      { label: t('server.menu.mute.for1h'), action: () => prefs.muteServer(server.id, prefs.Durations.h1) } as any,
      { label: t('server.menu.mute.for3h'), action: () => prefs.muteServer(server.id, prefs.Durations.h3) } as any,
      { label: t('server.menu.mute.for8h'), action: () => prefs.muteServer(server.id, prefs.Durations.h8) } as any,
      { label: t('server.menu.mute.for24h'), action: () => prefs.muteServer(server.id, prefs.Durations.h24) } as any,
      { type: 'separator' } as any,
      { label: t('server.menu.mute.untilTurnBackOn'), action: () => prefs.muteServer(server.id, 'forever') } as any,
    ] });
  } else {
    augmented.push({ label: t('server.menu.unmuteServer'), icon: Bell as any, action: () => prefs.unmuteServer(server.id) });
  }

  currentServerMenuItems.value = augmented as any;
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

<style scoped>
.scrollbar-hidden {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.scrollbar-hidden::-webkit-scrollbar {
  display: none; /* WebKit */
}
</style>
