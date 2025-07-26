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
                <div v-if="channel.type === ChannelType.Voice"
                     :class="['channel-item voice-channel', { 'active': appStore.currentVoiceChannelId === channel.id }]"
                     @click="toggleVoiceChannel(channel)"
                     @contextmenu.prevent="openChannelMenu($event, channel)"
                >
                  <Volume2 class="w-4 h-4 text-text-muted"/>
                  <span class="truncate">{{ channel.name }}</span>
                </div>
                <RouterLink v-else
                    :class="{ 'active': currentChannelId === channel.id }"
                    :to="`/servers/${server!.id}/channels/${channel.id}`" class="channel-item group"
                    @contextmenu.prevent="openChannelMenu($event, channel)"
                >
                  <Hash class="w-4 h-4 text-text-muted"/>
                  <span class="truncate">{{ channel.name }}</span>
                  <button v-if="canManageChannels" class="ml-auto opacity-0 group-hover:opacity-100 transition"
                          title="Edit Channel" @click.prevent.stop="openEditModal(channel)">
                    <Settings class="w-4 h-4 text-text-secondary hover:text-text-default"/>
                  </button>
                </RouterLink>
                <ul v-if="channel.type === ChannelType.Voice && appStore.voiceChannelUsers.get(channel.id)?.length" class="ml-6 mt-1 space-y-0.5">
                  <li v-for="user in appStore.voiceChannelUsers.get(channel.id)" :key="user.id" class="flex items-center gap-1 text-xs text-text-muted">
                    <UserAvatar :avatar-url="user.avatar" :user-id="user.id" :username="user.username" :size="16"/>
                    <span class="truncate">{{ user.username }}</span>
                  </li>
                </ul>
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
import {ref, computed, watchEffect, nextTick, onBeforeUnmount, type ComponentPublicInstance} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {Edit, Hash, Loader2, Plus, PlusCircle, Settings, Trash2, Volume2} from 'lucide-vue-next';
import EditChannelModal from '@/components/modals/EditChannelModal.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import {useDragAndDrop, dragAndDrop} from '@formkit/drag-and-drop/vue';
import {animations, insert, tearDown} from '@formkit/drag-and-drop';
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

const insertPointClasses = [
  'absolute',
  'bg-blue-500',
  'z-[1000]',
  'rounded-full',
  'duration-[5ms]',
  'before:block',
  'before:content-["Insert"]',
  'before:whitespace-nowrap',
  'before:block',
  'before:bg-blue-500',
  'before:py-1',
  'before:px-2',
  'before:rounded-full',
  'before:text-xs',
  'before:absolute',
  'before:top-1/2',
  'before:left-1/2',
  'before:-translate-y-1/2',
  'before:-translate-x-1/2',
  'before:text-white',
  'before:text-xs',
];

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
const isSavingOrder = ref(false);
const deletingChannel = ref<ChannelListItem | null>(null);

// --- Computed ---
const currentChannelId = computed(() => route.params.channelId ? parseInt(route.params.channelId as string) : null);

const [topicsParent, topics] = useDragAndDrop<TopicListItem>([], {
  plugins: [
    animations(),
    insert({
      insertPoint: () => {
        const div = document.createElement('div');
        for (const cls of insertPointClasses) div.classList.add(cls);
        return div;
      },
    }),
  ],
  draggable: (el: HTMLElement) => canManageChannels.value && el.tagName == 'LI',
  onSort: () => saveOrder(),
  onTransfer: () => saveOrder(),
});

const channelParentRefs = ref<Record<number, HTMLElement | undefined>>({});
const setChannelParent = (id: number) => (el: Element | ComponentPublicInstance | null) => {
  channelParentRefs.value[id] = el as HTMLElement || undefined;
};

let channelDndParents: HTMLElement[] = [];

watchEffect(() => {
  if (!props.server) {
    topics.value.splice(0, topics.value.length);
    return;
  }
  const newSortedTopics = [...props.server.topics]
      .sort((a, b) => a.position - b.position)
      .map(t => ({
        ...t,
        channels: [...t.channels],
      }));
  topics.value.splice(0, topics.value.length, ...newSortedTopics);
});

watchEffect((onCleanup) => {
  if (isSavingOrder.value) return;
  Object.values(channelParentRefs.value);
  nextTick().then(() => {
    channelDndParents.forEach(p => tearDown(p));
    channelDndParents = [];

    const configs = topics.value.flatMap(topic => {
      const parent = channelParentRefs.value[topic.id];
      if (!parent) return [];
      channelDndParents.push(parent);
      return [{
        parent,
        values: topic.channels,
        group: 'channels',
        plugins: [
          animations(),
          insert({
            insertPoint: () => {
              const div = document.createElement('div');
              for (const cls of insertPointClasses) div.classList.add(cls);
              return div;
            },
          }),
        ],
        draggable: (el: HTMLElement) => canManageChannels.value && el.tagName === 'LI',
        onSort: () => saveOrder(),
        onTransfer: () => saveOrder(),
      }];
    });

    dragAndDrop(configs);
  });

  onCleanup(() => {
    channelDndParents.forEach(p => tearDown(p));
    channelDndParents = [];
  });
});

onBeforeUnmount(() => {
  channelDndParents.forEach(p => tearDown(p));
  channelDndParents = [];
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

const toggleVoiceChannel = async (channel: ChannelListItem) => {
  if (appStore.currentVoiceChannelId === channel.id) {
    await appStore.leaveVoiceChannel(channel.id);
  } else {
    await appStore.joinVoiceChannel(channel.id);
  }
};

const saveOrder = async () => {
  if (!props.server || isSavingOrder.value) return;

  isSavingOrder.value = true;
  const updatePromises: Promise<any>[] = [];

  try {
    topics.value.forEach((topic, topicIndex) => {
      updatePromises.push(appStore.updateTopic(topic.id, {position: topicIndex}));
      topic.channels.forEach((channel, channelIndex) => {
        updatePromises.push(appStore.updateChannel(channel.id, {position: channelIndex, topicId: topic.id}));
      });
    });

    await Promise.all(updatePromises);

  } catch (error) {
    await appStore.fetchServer(props.server.id);
  } finally {
    if (props.server) {
      await appStore.fetchServer(props.server.id);
    }
    isSavingOrder.value = false;
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
