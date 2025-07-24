<template>
  <div class="w-60 bg-main-950 flex flex-col h-full overflow-hidden">
    <div class="px-4 h-14 border-b border-l border-r border-border-default shadow-xs flex-shrink-0 flex items-center">
      <h2 class="font-semibold text-text-default truncate">
        {{ server?.name || 'Loading...' }}
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto border-l border-r border-border-default shadow-xs scrollbar-thin min-h-0">
      <div v-if="loading" class="flex items-center justify-center py-8">
        <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
      </div>

      <div v-else class="py-2">
        <ul ref="topicsParent" class="space-y-4">
          <li v-for="topic in topics" :key="topic.id" class="px-2 mb-4">
            <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-text-muted uppercase">
              <span>{{ topic.name }}</span>
              <button
                  v-if="canManageChannels"
                  class="hover:text-text-secondary transition"
                  title="Create Channel"
                  @click="appStore.openCreateChannelModal(server!.id)"
              >
                <Plus class="w-4 h-4"/>
              </button>
            </div>
            <ul :ref="setChannelParent(topic.id)" class="space-y-0.5">
              <li v-for="channel in topic.channels" :key="channel.id">
                <RouterLink
                    :class="{ 'active': currentChannelId === channel.id }"
                    :to="`/servers/${server!.id}/channels/${channel.id}`" class="channel-item group"
                    @contextmenu.prevent="openChannelMenu($event, channel)"
                >
                  <component :is="channel.type === ChannelType.Voice ? Volume2 : Hash" class="w-4 h-4 text-text-muted"/>
                  <span class="truncate">{{ channel.name }}</span>
                  <button v-if="canManageChannels" class="ml-auto opacity-0 group-hover:opacity-100 transition"
                          title="Edit Channel" @click.prevent.stop="openEditModal(channel)">
                    <Settings class="w-4 h-4 text-text-secondary hover:text-text-default"/>
                  </button>
                </RouterLink>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <!-- User info section -->
    <div class="px-2 py-2 bg-main-950 border-t border-l border-r border-border-default">
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-main-800 transition">
        <UserAvatar
            :avatar-url="authStore.user?.avatar"
            :size="32"
            :user-id="authStore.user?.id"
            :username="authStore.user?.username || ''"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-default truncate">
            {{ getDisplayName(authStore.user) }}
          </p>
          <div class="text-xs text-text-muted truncate">
            @{{ authStore.user?.username }}
          </div>
        </div>
        <RouterLink title="Felhasználói beállítások" to="/settings/profile">
          <Settings class="w-4 h-4 text-text-muted hover:text-text-secondary cursor-pointer"/>
        </RouterLink>
      </div>
    </div>

    <ContextMenu ref="channelContextMenu" :items="channelMenuItems"/>
    <ConfirmModal
        v-model="isConfirmDeleteOpen"
        :is-loading="isDeleting"
        :message="`Are you sure you want to delete the channel #${deletingChannel?.name}? This is permanent.`"
        confirm-text="Delete Channel"
        intent="danger"
        title="Delete Channel"
        @confirm="confirmDeleteChannel"
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

<script lang="ts" setup>
import type {Component} from 'vue';
import {computed, ref, watchEffect, nextTick, type ComponentPublicInstance} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {Edit, Hash, Loader2, Plus, PlusCircle, Settings, Trash2, Volume2} from 'lucide-vue-next';
import EditChannelModal from '@/components/modals/EditChannelModal.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import { useDragAndDrop, dragAndDrop } from '@formkit/drag-and-drop/vue';
import { animations } from '@formkit/drag-and-drop';
import channelService from '@/services/channelService';
import {
  type ChannelDetailDto,
  type ChannelListItem,
  ChannelType,
  type ServerDetails,
  type TopicListItem
} from '@/services/types';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {usePermissions} from '@/composables/usePermissions';

// --- Props & Store ---
const props = defineProps<{
  server: ServerDetails | null;
  loading: boolean;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();
const {addToast} = useToast();
const {getDisplayName} = useUserDisplay();
const {permissions} = usePermissions();

// --- State ---
const isEditModalOpen = ref(false);
const editingChannel = ref<ChannelDetailDto | null>(null);

interface MenuItem {
  label: string;
  icon: Component;
  action: () => void;
  danger?: boolean;
}

const channelContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const channelMenuItems = ref<MenuItem[]>([]);
const isConfirmDeleteOpen = ref(false);
const isDeleting = ref(false);
const deletingChannel = ref<ChannelListItem | null>(null);

// --- Computed ---
const currentChannelId = computed(() => route.params.channelId ? parseInt(route.params.channelId as string) : null);

const [topicsParent, topics] = useDragAndDrop<TopicListItem>([], {
  plugins: [animations()],
  draggable: (el: HTMLElement) => el.tagName == 'LI',
  onSort: () => saveOrder(),
  onTransfer: () => saveOrder(),
});
const channelParentRefs = ref<Record<number, HTMLElement | undefined>>({});
const setChannelParent = (id: number) => (el: Element | ComponentPublicInstance | null) => {
  channelParentRefs.value[id] = el as HTMLElement || undefined;
};

watchEffect(() => {
  if (!props.server) {
    topics.value = [];
    return;
  }
  topics.value = [...props.server.topics]
      .sort((a, b) => a.position - b.position)
      .map(t => ({
        ...t,
        channels: [...t.channels],
      }));
});

watchEffect(async () => {
  await nextTick();
  const configs = topics.value.flatMap(topic => {
    const parent = channelParentRefs.value[topic.id];
    return parent
        ? [{
          parent,
          values: topic.channels,
          group: 'channels',
          plugins: [animations()],
          draggable: (el: HTMLElement) => el.tagName === 'LI',
          onSort: () => saveOrder(),
          onTransfer: () => saveOrder(),
        }]
        : [];
  });
  dragAndDrop(configs);
});

const canManageChannels = permissions.manageChannels;

// --- Methods ---
const openEditModal = async (channel: ChannelListItem) => {
  try {
    editingChannel.value = await channelService.getChannel(channel.id);
    isEditModalOpen.value = true;
  } catch (error) {
    addToast({
      message: 'Failed to load channel details for editing.',
      type: 'danger'
    });
  }
};

const openChannelMenu = (event: MouseEvent, channel: ChannelListItem) => {
  if (!canManageChannels.value) return;

  channelMenuItems.value = [
    {label: 'Edit Channel', icon: Edit, action: () => openEditModal(channel)},
    {label: 'Create Channel', icon: PlusCircle, action: () => appStore.openCreateChannelModal(props.server!.id)},
    {label: 'Delete Channel', icon: Trash2, danger: true, action: () => promptDeleteChannel(channel)},
  ];
  channelContextMenu.value?.open(event);
};

const promptDeleteChannel = (channel: ChannelListItem) => {
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
};

const saveOrder = async () => {
  if (!props.server) return;
  for (let i = 0; i < topics.value.length; i++) {
    const topic = topics.value[i];
    await appStore.updateTopic(topic.id, { position: i });
    for (let j = 0; j < topic.channels.length; j++) {
      const ch = topic.channels[j];
      await appStore.updateChannel(ch.id, { position: j, topicId: topic.id });
    }
  }
};

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
      router.push({name: 'Server', params: {serverId: props.server.id}});
    }
  }
}
</script>
