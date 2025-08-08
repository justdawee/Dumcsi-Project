<template>
  <SidebarContainer>
    <template #header>
      <button
          ref="serverDropdownTrigger"
          class="w-full px-4 py-3 font-semibold text-text-default hover:bg-main-800/50 transition-colors flex items-center justify-between group cursor-pointer"
          @click="openServerDropdown"
      >
        <span class="truncate text-left flex-1 mr-2">{{ server?.name || 'Loading...' }}</span>
        <ChevronDown
            :class="['w-4 h-4 flex-shrink-0 transition-transform group-hover:text-text-secondary', { 'rotate-180': isServerDropdownOpen }]"
        />
      </button>
    </template>

    <template #content>
      <div v-if="loading" class="flex items-center justify-center py-8">
        <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
      </div>

      <div v-else class="py-2">
        <div ref="topicsParent" class="space-y-4">
          <!-- Independent Channels (without topic) -->
          <div v-if="independentChannels.length > 0" class="px-2 mb-4">
            <div class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-text-muted uppercase">
              <span>Channels</span>
              <button
                  v-if="canManageChannels"
                  class="hover:text-text-secondary transition"
                  title="Create Channel"
                  @click="appStore.openCreateChannelModal(server!.id)"
              >
                <Plus class="w-4 h-4"/>
              </button>
            </div>
            <ul :ref="setChannelParent('independent')" class="space-y-0.5">
              <li v-for="channel in independentChannels" :key="channel.id">
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
                <ul v-if="channel.type === ChannelType.Voice && appStore.voiceChannelUsers.get(channel.id)?.length"
                    class="ml-6 mt-1 space-y-0.5">
                  <li v-for="user in appStore.voiceChannelUsers.get(channel.id)" :key="user.id"
                      class="flex items-center gap-1 text-xs text-text-muted">
                    <UserAvatar :avatar-url="user.avatar" :size="16" :user-id="user.id" :username="user.username"/>
                    <span class="truncate">{{ user.username }}</span>
                    <div v-if="appStore.currentVoiceChannelId === channel.id && user.id === appStore.currentUserId" 
                         class="ml-auto flex items-center gap-1">
                      <span v-if="appStore.selfMuted" class="text-red-400" title="Muted">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                      </span>
                      <span v-else class="text-green-400" title="Speaking">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 01 15 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
                        </svg>
                      </span>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <!-- Topics with channels -->
          <div v-for="topic in topics" :key="topic.id" :data-topic-id="topic.id" class="px-2 mb-4 topic-container">
            <div
                class="flex items-center justify-between px-2 py-1 text-xs font-semibold text-text-muted uppercase cursor-move">
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
                <ul v-if="channel.type === ChannelType.Voice && appStore.voiceChannelUsers.get(channel.id)?.length"
                    class="ml-6 mt-1 space-y-0.5">
                  <li v-for="user in appStore.voiceChannelUsers.get(channel.id)" :key="user.id"
                      class="flex items-center gap-1 text-xs text-text-muted">
                    <UserAvatar :avatar-url="user.avatar" :size="16" :user-id="user.id" :username="user.username"/>
                    <span class="truncate">{{ user.username }}</span>
                    <div v-if="appStore.currentVoiceChannelId === channel.id && user.id === appStore.currentUserId" 
                         class="ml-auto flex items-center gap-1">
                      <span v-if="appStore.selfMuted" class="text-red-400" title="Muted">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                      </span>
                      <span v-else class="text-green-400" title="Speaking">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 01 15 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
                        </svg>
                      </span>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <ContextMenu ref="channelContextMenu" :items="channelMenuItems"/>
      <ContextMenu ref="serverDropdownMenu" :items="serverMenuItems"/>
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
      <BaseModal v-model="isCreateTopicModalOpen" title="Create Topic">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-default mb-2">Topic Name</label>
            <input
                v-model="newTopicName"
                class="w-full px-3 py-2 bg-main-800 border border-main-600 rounded-md text-text-default placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Enter topic name..."
                type="text"
                @keydown.enter="createTopic"
            />
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <button
                class="px-4 py-2 text-text-muted hover:text-text-default transition-colors"
                @click="isCreateTopicModalOpen = false"
            >
              Cancel
            </button>
            <button
                :disabled="!newTopicName.trim()"
                class="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-md transition-colors disabled:opacity-50"
                @click="createTopic"
            >
              Create Topic
            </button>
          </div>
        </template>
      </BaseModal>
    </template>

  </SidebarContainer>

  <!-- Server Menu Modals -->
  <InviteModal
      v-model="serverMenu.isInviteModalOpen.value"
      :invite-code="serverMenu.generatedInviteCode.value"
      :server="serverMenu.selectedServer.value"
  />

  <EditServerModal
      v-model="serverMenu.isEditServerModalOpen.value"
      :server="serverMenu.selectedServer.value"
      @close="serverMenu.isEditServerModalOpen.value = false"
      @server-updated="props.server && appStore.fetchServer(props.server.id)"
  />

  <ManageRolesModal
      v-model="serverMenu.isManageRolesModalOpen.value"
      :server="serverMenu.selectedServer.value"
      @close="serverMenu.isManageRolesModalOpen.value = false"
  />

  <BaseModal v-model="serverMenu.isCreateTopicModalOpen.value" title="Create Topic">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-default mb-2">Topic Name</label>
        <input
            v-model="serverMenu.newTopicName.value"
            class="w-full px-3 py-2 bg-main-800 border border-main-600 rounded-md text-text-default placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Enter topic name..."
            type="text"
            @keydown.enter="serverMenu.createTopic"
        />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <button
            class="px-4 py-2 text-text-muted hover:text-text-default transition-colors"
            @click="serverMenu.isCreateTopicModalOpen.value = false"
        >
          Cancel
        </button>
        <button
            :disabled="!serverMenu.newTopicName.value.trim()"
            class="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-md transition-colors disabled:opacity-50"
            @click="serverMenu.createTopic"
        >
          Create Topic
        </button>
      </div>
    </template>
  </BaseModal>

  <ConfirmModal
      v-model="serverMenu.isLeaveConfirmOpen.value"
      :is-loading="serverMenu.isLeaving.value"
      :message="`Are you sure you want to leave ${serverMenu.selectedServer.value?.name}? You won't be able to rejoin this server unless you are re-invited.`"
      :title="`Leave '${serverMenu.selectedServer.value?.name}'`"
      confirm-text="Leave Server"
      intent="danger"
      @confirm="serverMenu.confirmLeaveServer"
  />
</template>

<script lang="ts" setup>
import type {Component} from 'vue';
import {ref, computed, watchEffect, nextTick, onBeforeUnmount, type ComponentPublicInstance} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {Edit, Hash, Loader2, Plus, PlusCircle, Settings, Trash2, Volume2, ChevronDown} from 'lucide-vue-next';
import EditChannelModal from '@/components/modals/EditChannelModal.vue';
import BaseModal from '@/components/modals/BaseModal.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import SidebarContainer from '@/components/common/SidebarContainer.vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import InviteModal from '@/components/modals/InviteModal.vue';
import EditServerModal from '@/components/modals/EditServerModal.vue';
import ManageRolesModal from '@/components/modals/ManageRolesModal.vue';
import {useDragAndDrop, dragAndDrop} from '@formkit/drag-and-drop/vue';
import {animations, insert, tearDown} from '@formkit/drag-and-drop';
import channelService from '@/services/channelService';
import serverService from '@/services/serverService';
import {
  type ChannelDetailDto,
  type ChannelListItem,
  ChannelType,
  type ServerDetails,
  type TopicListItem,
  type ServerListItem
} from '@/services/types';
import {usePermissions} from '@/composables/usePermissions';
import {useServerMenu} from '@/composables/useServerMenu';
import {useContextMenuManager} from '@/composables/useContextMenuManager';

// --- Props & Store ---
const props = defineProps<{
  server: ServerDetails | null;
  loading: boolean;
}>();

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const {addToast} = useToast();
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
const isCreateTopicModalOpen = ref(false);
const newTopicName = ref('');

// Server dropdown states
const isServerDropdownOpen = ref(false);
const serverDropdownTrigger = ref<HTMLElement | null>(null);
const serverDropdownMenu = ref<InstanceType<typeof ContextMenu> | null>(null);

// Server menu composable
const serverMenu = useServerMenu();

// --- Computed ---
const currentChannelId = computed(() => route.params.channelId ? parseInt(route.params.channelId as string) : null);

const independentChannels = computed(() => {
  if (!props.server) return [];
  return props.server.channels.filter(channel => !channel.topicId);
});

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

const channelParentRefs = ref<Record<number | string, HTMLElement | undefined>>({});
const setChannelParent = (id: number | string) => (el: Element | ComponentPublicInstance | null) => {
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

    const configs = [];

    // Add independent channels drag-and-drop if they exist
    if (independentChannels.value.length > 0) {
      const independentParent = channelParentRefs.value['independent'];
      if (independentParent) {
        channelDndParents.push(independentParent);
        configs.push({
          parent: independentParent,
          values: independentChannels.value,
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
        });
      }
    }

    // Add topic channels drag-and-drop
    topics.value.forEach(topic => {
      const parent = channelParentRefs.value[topic.id];
      if (!parent) return;
      channelDndParents.push(parent);
      configs.push({
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
      });
    });

    if (configs.length > 0) {
      dragAndDrop(configs);
    }
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

// Server dropdown computed
const serverMenuItems = computed(() => {
  if (!props.server) return [];
  const serverListItem: ServerListItem = {
    id: props.server.id,
    name: props.server.name,
    icon: props.server.icon,
    isOwner: props.server.isOwner,
    memberCount: 0, // Not used in context menu
    description: props.server.description || null,
    public: false, // Not used in context menu  
    createdAt: new Date().toISOString() // Not used in context menu
  };
  return serverMenu.getServerMenuItems(serverListItem);
});

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
    {label: 'Create Topic', icon: Plus, action: () => openCreateTopicModal()},
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
    // Update independent channels positions (topicId = null)
    independentChannels.value.forEach((channel, channelIndex) => {
      updatePromises.push(appStore.updateChannel(channel.id, {position: channelIndex, topicId: null}));
    });

    // Update topics and their channels positions
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
};

const openCreateTopicModal = () => {
  newTopicName.value = '';
  isCreateTopicModalOpen.value = true;
};

const createTopic = async () => {
  if (!props.server || !newTopicName.value.trim()) return;

  try {
    await serverService.createTopic(props.server.id, {name: newTopicName.value.trim()});
    await appStore.fetchServer(props.server.id);
    addToast({
      message: 'Topic created successfully!',
      type: 'success'
    });
  } catch (error: any) {
    addToast({
      message: error.message || 'Failed to create topic',
      type: 'danger'
    });
  } finally {
    isCreateTopicModalOpen.value = false;
    newTopicName.value = '';
  }
};

// Server dropdown methods
const openServerDropdown = () => {
  if (!props.server || serverMenuItems.value.length === 0) return;

  if (isServerDropdownOpen.value) {
    // If already open, close it
    isServerDropdownOpen.value = false;
    return;
  }

  isServerDropdownOpen.value = true;

  // Create a synthetic event with the trigger button position
  const triggerRect = serverDropdownTrigger.value?.getBoundingClientRect();
  if (triggerRect) {
    const syntheticEvent = {
      clientX: triggerRect.left,
      clientY: triggerRect.bottom + 4
    } as MouseEvent;

    serverDropdownMenu.value?.open(syntheticEvent);
  }
};

// Watch for when the server dropdown menu closes to reset the chevron state
const {activeMenus} = useContextMenuManager();

watchEffect(() => {
  // If there are no active menus and our dropdown was open, close it
  if (activeMenus.value.length === 0 && isServerDropdownOpen.value) {
    isServerDropdownOpen.value = false;
  }
});
</script>
