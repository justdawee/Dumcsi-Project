import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import type { AxiosError, AxiosResponse } from 'axios';
import type {
  ServerListItem,
  ServerDetail,
  ChannelDetail,
  MessageListItem,
  ServerMember,
  CreateServerPayload,
  CreateChannelPayload,
  CreateMessagePayload,
  UpdateMessagePayload,
  EntityId, // Assuming this is defined in types.ts as `export type EntityId = number;`
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';

export const useAppStore = defineStore('app', () => {
  // --- State ---
  const servers = ref<ServerListItem[]>([]);
  const currentServer = ref<ServerDetail | null>(null);
  const currentChannel = ref<ChannelDetail | null>(null);
  const messages = ref<MessageListItem[]>([]);
  const members = ref<ServerMember[]>([]);
  const isCreateChannelModalOpen = ref(false);
  const createChannelForServerId = ref<EntityId | null>(null);

  const loading = ref({
    servers: false,
    server: false,
    channel: false,
    messages: false,
    members: false,
  });

  // A single ref for the latest error message
  const error = ref<string | null>(null);

  // --- Getters ---
  const currentServerChannels = computed(() => currentServer.value?.channels || []);

  // --- Private Helpers ---
  
  /**
   * @description A generic helper to handle API calls, loading states, and errors.
   * @param loadingKey The key for the loading state object.
   * @param apiCall The async function to execute.
   */

  const handleApiCall = async <T>(loadingKey: keyof typeof loading.value, apiCall: () => Promise<T>): Promise<T | null> => {
    loading.value[loadingKey] = true;
    error.value = null;
    try {
      return await apiCall();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      error.value = axiosError.response?.data?.message || (axiosError.message || 'An unknown error occurred');
      console.error(`API call failed for ${loadingKey}:`, error.value);
      return null;
    } finally {
      loading.value[loadingKey] = false;
    }
  };
  
  /**
   * @description Resets the state related to the current server and channel.
   */

  const resetCurrentSelection = () => {
    currentServer.value = null;
    currentChannel.value = null;
    messages.value = [];
    members.value = [];
  }

  // --- Actions ---

  const fetchServers = async () => {
    const response = await handleApiCall('servers', () => serverService.getServers());
    if (response) {
      servers.value = response.data;
    }
  };

  const fetchServer = async (serverId: EntityId) => {
    // When fetching a new server, clear previous selection first
    resetCurrentSelection();
    
    const response = await handleApiCall('server', () => serverService.getServer(serverId));
    if (response) {
      currentServer.value = response.data;
      await fetchServerMembers(serverId);
    }
  };

  const fetchChannel = async (channelId: EntityId) => {
    const response = await handleApiCall('channel', () => channelService.getChannel(channelId));
    if (response) {
      currentChannel.value = response.data;
      messages.value = response.data.messages.reverse();
    } else {
      currentChannel.value = null;
    }
  };

  const fetchMoreMessages = async (channelId: EntityId, before: EntityId) => {
    const response = await handleApiCall('messages', () => messageService.getMessages(channelId, { before, limit: 50 }));
    if (response && response.data.length > 0) {
      messages.value.unshift(...response.data.reverse());
    }
  };

  const fetchServerMembers = async (serverId: EntityId) => {
    const response = await handleApiCall('members', () => serverService.getServerMembers(serverId));
    if (response) {
      members.value = response.data;
    }
  };

  const sendMessage = async (channelId: EntityId, payload: CreateMessagePayload) => {
    try {
      const response = await messageService.sendMessage(channelId, payload);
      messages.value.push(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      error.value = axiosError.response?.data?.message || 'Failed to send message';
      throw err;
    }
  };

  const createServer = async (serverData: CreateServerPayload) => {
    const response = await handleApiCall('servers', () => serverService.createServer(serverData));
    if (response) {
      const newServerDetails = await serverService.getServer(response.data.serverId);
      if (newServerDetails.data) {
        servers.value.push(newServerDetails.data);
      }
      return response.data;
    }
  };

  const createChannel = async (serverId: EntityId, channelData: CreateChannelPayload) => {
    const response = await handleApiCall('channel', () => serverService.createChannel(serverId, channelData));
    if (response && currentServer.value && currentServer.value.id === serverId) {
      currentServer.value.channels = [...currentServer.value.channels, response.data];
    }
    return response?.data;
  };

  const editMessage = async (messageId: EntityId, payload: UpdateMessagePayload) => {
  try {
    await messageService.editMessage(currentChannel.value!.id, messageId, payload);
    
    // Find the message in the local state and update it.
    const message = messages.value.find(m => m.id === messageId);
    if (message) {
      message.content = payload.content;
      message.editedAt = new Date().toISOString(); // Simulate immediate update
    }
  } catch (err) {
    console.error("Failed to edit message:", err);
    throw err;
  }
};

const deleteMessage = async (messageId: EntityId) => {
  try {
    await messageService.deleteMessage(currentChannel.value!.id, messageId);

    // Optimistically remove the message from the local state.
    const index = messages.value.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  } catch (err) {
    console.error("Failed to delete message:", err);
    throw err;
  }
};
  
  const handleServerMembershipChange = async (apiCall: () => Promise<AxiosResponse<{serverId: number}>>) => {
      const response = await handleApiCall('servers', apiCall);
      if (response) {
          const newServerDetails = await serverService.getServer(response.data.serverId);
          if (newServerDetails.data && !servers.value.some(s => s.id === newServerDetails.data.id)) {
              servers.value.push(newServerDetails.data);
          }
          return { serverId: response.data.serverId };
      }
  }

  const joinServer = (inviteCode: string) => {
      return handleServerMembershipChange(() => serverService.joinServer(inviteCode));
  };
  
  const joinPublicServer = (serverId: EntityId) => {
      return handleServerMembershipChange(() => serverService.joinPublicServer(serverId));
  };

  const leaveServer = async (serverId: EntityId) => {
    await handleApiCall('servers', () => serverService.leaveServer(serverId));
    if (currentServer.value?.id === serverId) {
      resetCurrentSelection();
    }
    // Optimistically remove the server from the list.
    servers.value = servers.value.filter(s => s.id !== serverId);
  };

  const updateCurrentChannelDetails = (payload: { id: EntityId; name: string; description?: string }) => {
    if (currentServer.value) {
      const channelIndex = currentServer.value.channels.findIndex(c => c.id === payload.id);
      if (channelIndex !== -1) {
        const updatedChannel = { ...currentServer.value.channels[channelIndex], ...payload };
        // Replace the item in the array to trigger reactivity correctly.
        currentServer.value.channels.splice(channelIndex, 1, updatedChannel);
      }
    }
    if (currentChannel.value && currentChannel.value.id === payload.id) {
        currentChannel.value.name = payload.name;
        currentChannel.value.description = payload.description;
    }
  };

  const openCreateChannelModal = (serverId: EntityId) => {
    createChannelForServerId.value = serverId;
    isCreateChannelModalOpen.value = true;
  };

  const closeCreateChannelModal = () => {
    isCreateChannelModalOpen.value = false;
    createChannelForServerId.value = null;
  };

  const reset = () => {
    servers.value = [];
    resetCurrentSelection();
    error.value = null;
    // Reset loading states
    Object.keys(loading.value).forEach(key => (loading.value[key as keyof typeof loading.value] = false));
  };

  return {
    servers,
    currentServer,
    currentChannel,
    messages,
    members,
    loading: readonly(loading), // Expose as readonly to prevent direct mutation
    error: readonly(error),
    currentServerChannels,
    isCreateChannelModalOpen,
    createChannelForServerId,
    
    fetchServers,
    fetchServer,
    fetchChannel,
    fetchMoreMessages,
    sendMessage,
    createServer,
    createChannel,
    editMessage,
    deleteMessage,
    updateCurrentChannelDetails,
    openCreateChannelModal,
    closeCreateChannelModal,
    joinServer,
    joinPublicServer,
    leaveServer,
    reset,
  };
});