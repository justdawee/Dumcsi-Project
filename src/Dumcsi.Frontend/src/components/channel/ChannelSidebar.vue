<template>
  <div class="w-60 bg-gray-850 flex flex-col h-full overflow-hidden">
    <div class="px-4 h-14 border-b border-r border-gray-700 shadow-xs flex-shrink-0 flex items-center">
      <h2 class="font-semibold text-white truncate">
        {{ server?.name || 'Loading...' }}
      </h2>
    </div>
    
    <div class="flex-1 overflow-y-auto border-r border-gray-700 shadow-xs scrollbar-thin min-h-0">
      <div v-if="loading" class="flex items-center justify-center py-8">
        <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
      </div>
      
      <div v-else class="py-2">
        <div class="px-2 mb-4">
          <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
            <span>Text Channels</span>
            <button
              v-if="canManageChannels"
              @click="appStore.openCreateChannelModal(server!.id)"
              class="hover:text-gray-200 transition"
              title="Create Channel"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          
          <div class="space-y-0.5">
            <RouterLink
              v-for="channel in textChannels"
              :key="channel.id"
              :to="`/servers/${server!.id}/channels/${channel.id}`"
              class="channel-item group" :class="{ 'active': currentChannelId === channel.id }"
              @contextmenu.prevent="openChannelMenu($event, channel)"
            >
              <Hash class="w-4 h-4 text-gray-400" />
              <span class="truncate">{{ channel.name }}</span>
              <button v-if="canManageChannels" @click.prevent.stop="openEditModal(channel)" class="ml-auto opacity-0 group-hover:opacity-100 transition" title="Edit Channel">
                <Settings class="w-4 h-4 text-gray-300 hover:text-white" />
              </button>
            </RouterLink>
          </div>
        </div>
        
        <div v-if="voiceChannels.length > 0" class="px-2 mb-2">
          <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
            <span>Voice Channels</span>
            <button
              v-if="canManageChannels"
              @click="appStore.openCreateChannelModal(server!.id)"
              class="hover:text-gray-200 transition"
              title="Create Channel"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          <div class="space-y-0.5">
            <div
              v-for="channel in voiceChannels"
              :key="channel.id"
              class="channel-item group voice-channel"
              @contextmenu.prevent="openChannelMenu($event, channel)"
            >
              <Volume2 class="w-4 h-4 text-gray-400" />
              <span class="truncate">{{ channel.name }}</span>
              <button v-if="canManageChannels" @click.prevent.stop="openEditModal(channel)" class="ml-auto opacity-0 group-hover:opacity-100 transition" title="Edit Channel">
                <Settings class="w-4 h-4 text-gray-300 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- User info section -->
    <div class="px-2 py-2 bg-gray-900 border-t border-r border-gray-700">
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-gray-800 transition">
        <UserAvatar
          :avatar-url="authStore.user?.avatar"
          :username="authStore.user?.username || ''"
          :size="'xs'"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ getDisplayName(authStore.user) }}
          </p>
           <div class="text-xs text-gray-400 truncate">
            @{{ authStore.user?.username }}
          </div>
        </div>
        <RouterLink to="/settings/profile" title="Felhasználói beállítások">
          <Settings class="w-4 h-4 text-gray-400 hover:text-gray-200 cursor-pointer" />
        </RouterLink>
      </div>
    </div>

    <ContextMenu ref="channelContextMenu" :items="channelMenuItems" />
    <ConfirmModal
      v-model="isConfirmDeleteOpen"
      title="Delete Channel"
      :message="`Are you sure you want to delete the channel #${deletingChannel?.name}? This is permanent.`"
      confirm-text="Delete Channel"
      :is-loading="isDeleting"
      @confirm="confirmDeleteChannel"
      intent="danger"
    />
    <EditChannelModal
      v-model="isEditModalOpen"
      :channel="editingChannel"
      @close="isEditModalOpen = false"
      @channel-updated="handleChannelUpdate"
      @channel-deleted="handleChannelDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import { Hash, Volume2, Plus, Settings, Loader2, Edit, Trash2, PlusCircle } from 'lucide-vue-next';
import type { Component } from 'vue';
import EditChannelModal from '@/components/modals/EditChannelModal.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import channelService from '@/services/channelService';
import {Permission, type ServerDetailDto, type ChannelListItemDto, ChannelType} from '@/services/types';
import { useUserDisplay } from '@/composables/useUserDisplay';

// --- Props & Store ---
const props = defineProps<{
  server: ServerDetailDto | null;
  loading: boolean;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();
const { addToast } = useToast();
const { getDisplayName } = useUserDisplay();

// --- State ---
const isEditModalOpen = ref(false);
const editingChannel = ref<ChannelListItemDto | null>(null);

interface MenuItem { label: string; icon: Component; action: () => void; danger?: boolean; }
const channelContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const channelMenuItems = ref<MenuItem[]>([]);
const isConfirmDeleteOpen = ref(false);
const isDeleting = ref(false);
const deletingChannel = ref<ChannelListItemDto | null>(null);

// --- Computed ---
const currentChannelId = computed(() => route.params.channelId ? parseInt(route.params.channelId as string) : null);
const textChannels = computed(() => props.server?.channels?.filter(c => c.type === ChannelType.Text) || []);
const voiceChannels = computed(() => props.server?.channels?.filter(c => c.type === ChannelType.Voice) || []);

const canManageChannels = computed(() => {
  if (!props.server) return false;
  return (props.server.currentUserPermissions & Permission.ManageChannels) !== 0;
});

// --- Methods ---
const openEditModal = (channel: ChannelListItemDto) => {
  editingChannel.value = channel;
  isEditModalOpen.value = true;
};

const openChannelMenu = (event: MouseEvent, channel: ChannelListItemDto) => {
  if (!canManageChannels.value) return; // Do not open menu if user lacks permission

  channelMenuItems.value = [
    { label: 'Edit Channel', icon: Edit, action: () => openEditModal(channel) },
    { label: 'Create Channel', icon: PlusCircle, action: () => appStore.openCreateChannelModal(props.server!.id) },
    { label: 'Delete Channel', icon: Trash2, danger: true, action: () => promptDeleteChannel(channel) },
  ];
  channelContextMenu.value?.open(event);
};

const promptDeleteChannel = (channel: ChannelListItemDto) => {
  deletingChannel.value = channel;
  isConfirmDeleteOpen.value = true;
};

const confirmDeleteChannel = async () => {
    if (!deletingChannel.value) return;
    isDeleting.value = true;
    try {
        await channelService.deleteChannel(deletingChannel.value.id);
        handleChannelDeleted(deletingChannel.value.id);
    } catch (error) {
        addToast({ 
          message: 'Failed to delete channel. Please try again later.',
          type: 'danger' 
        });
    } finally {
        isDeleting.value = false;
        isConfirmDeleteOpen.value = false;
        deletingChannel.value = null;
    }
}

const handleChannelUpdate = (updatedData: { id: number, name: string, description?: string }) => {
  if (props.server) {
    appStore.fetchServer(props.server.id);

    if (updatedData && updatedData.id === currentChannelId.value) {
        appStore.updateCurrentChannelDetails(updatedData);
    }
  }
};

const handleChannelDeleted = (deletedChannelId: number) => {
    if (props.server) {
        appStore.fetchServer(props.server.id);
        if (deletedChannelId === currentChannelId.value) {
            router.push({ name: 'Server', params: { serverId: props.server.id }});
        }
    }
}
</script>

<style scoped>
@reference "@/style.css";

.bg-gray-850 {
  background-color: #1e2939;
}

.channel-item {
  @apply flex items-center gap-2 px-2 py-1.5 rounded text-gray-400 
         hover:bg-gray-700 hover:text-gray-100 transition-colors cursor-pointer;
}

.channel-item.active {
  @apply bg-gray-700 text-white;
}

.channel-item.voice-channel {
  @apply opacity-50 cursor-pointer;
}

.channel-item.voice-channel:hover {
  @apply opacity-100;
}
</style>
