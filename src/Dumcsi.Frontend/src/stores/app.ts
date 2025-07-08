import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ServerListItemDto,
  ServerDetailDto,
  ChannelDetailDto,
  MessageDto,
  ServerMemberDto,
  CreateServerRequestDto,
  UpdateServerRequestDto,
  CreateChannelRequestDto,
  UpdateChannelRequestDto,
  CreateMessageRequestDto,
  UpdateMessageRequestDto,
  EntityId,
  UserProfileDto,
  ChannelListItemDto,
  CreateInviteRequestDto,
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';
import router from '@/router';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from './auth';

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<ServerListItemDto[]>([]);
  const currentServer = ref<ServerDetailDto | null>(null);
  const currentChannel = ref<ChannelDetailDto | null>(null);
  const messages = ref<MessageDto[]>([]);
  const members = ref<ServerMemberDto[]>([]);
  const onlineUsers = ref<Set<EntityId>>(new Set());
  const typingUsers = ref<Map<EntityId, Set<EntityId>>>(new Map());
  const voiceChannelUsers = ref<Map<EntityId, UserProfileDto[]>>(new Map());
  const screenShares = ref<Map<EntityId, Set<EntityId>>>(new Map());
  
  const isCreateChannelModalOpen = ref(false);
  const createChannelForServerId = ref<EntityId | null>(null);

  const loading = ref({
    servers: false,
    server: false,
    channel: false,
    messages: false,
    members: false,
  });

  const error = ref<string | null>(null);
  const { addToast } = useToast();

  // Computed
  const currentUserId = computed(() => {
    const authStore = useAuthStore();
    return authStore.user?.id || null;
  });

  // Helper for API calls
  const handleApiCall = async <T>(
    loadingKey: keyof typeof loading.value,
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    loading.value[loadingKey] = true;
    error.value = null;
    try {
      return await apiCall();
    } catch (err: any) {
      error.value = err.message || 'An error occurred';
      console.error(err);
      addToast({
        type: 'danger',
        message: error.value || 'An unknown error occurred',
      });
      return null;
    } finally {
      loading.value[loadingKey] = false;
    }
  };

  // Server Actions
  const fetchServers = async () => {
    const result = await handleApiCall('servers', () => serverService.getServers());
    if (result) servers.value = result;
  };

  const fetchServer = async (serverId: EntityId) => {
    const result = await handleApiCall('server', () => serverService.getServer(serverId));
    if (result) {
      currentServer.value = result;
      await fetchServerMembers(serverId);
    }
  };

  const fetchServerMembers = async (serverId: EntityId) => {
    const result = await handleApiCall('members', () => serverService.getServerMembers(serverId));
    if (result) members.value = result;
  };

  const createServer = async (payload: CreateServerRequestDto) => {
    const result = await serverService.createServer(payload);
    await fetchServers();
    await router.push(`/servers/${result.serverId}`);
    return result;
  };

  const updateServer = async (serverId: EntityId, payload: UpdateServerRequestDto) => {
    await serverService.updateServer(serverId, payload);
    await fetchServer(serverId);
    await fetchServers();
  };

  const deleteServer = async (serverId: EntityId) => {
    await serverService.deleteServer(serverId);
    await fetchServers();
    await router.push('/servers');
  };

  const leaveServer = async (serverId: EntityId) => {
    await serverService.leaveServer(serverId);
    await fetchServers();
    await router.push('/servers');
  };

  const generateInvite = async (serverId: EntityId, payload?: CreateInviteRequestDto) => {
    return await serverService.generateInvite(serverId, payload);
  };

  // Channel Actions
  const fetchChannel = async (channelId: EntityId) => {
    const result = await handleApiCall('channel', () => channelService.getChannel(channelId));
    if (result) {
      currentChannel.value = result;
      await fetchMessages(channelId);
    }
  };

  const createChannel = async (serverId: EntityId, payload: CreateChannelRequestDto) => {
    const result = await serverService.createChannel(serverId, payload);
    await fetchServer(serverId);
    return result;
  };

  const updateChannel = async (channelId: EntityId, payload: UpdateChannelRequestDto) => {
    await channelService.updateChannel(channelId, payload);
    if (currentChannel.value?.id === channelId) {
      await fetchChannel(channelId);
    }
    if (currentServer.value) {
      await fetchServer(currentServer.value.id);
    }
  };

  const deleteChannel = async (channelId: EntityId) => {
    await channelService.deleteChannel(channelId);
    if (currentServer.value) {
      await fetchServer(currentServer.value.id);
      const firstChannel = currentServer.value.channels?.[0];
      if (firstChannel) {
        await router.push(`/servers/${currentServer.value.id}/channels/${firstChannel.id}`);
      } else {
        await router.push(`/servers/${currentServer.value.id}`);
      }
    }
  };

  // Message Actions
  const fetchMessages = async (channelId: EntityId, before?: EntityId) => {
    const result = await handleApiCall('messages', () => 
      messageService.getMessages(channelId, { before, limit: 50 })
    );
    if (result) {
      if (before) {
        messages.value = [...result, ...messages.value];
      } else {
        messages.value = result;
      }
    }
  };

  const sendMessage = async (channelId: EntityId, payload: CreateMessageRequestDto) => {
    const result = await messageService.sendMessage(channelId, payload);
    messages.value.push(result);
    return result;
  };

  const editMessage = async (channelId: EntityId, messageId: EntityId, payload: UpdateMessageRequestDto) => {
    await messageService.editMessage(channelId, messageId, payload);
    const messageIndex = messages.value.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      messages.value[messageIndex] = {
        ...messages.value[messageIndex],
        content: payload.content,
        editedTimestamp: new Date().toISOString(),
      };
    }
  };

  const deleteMessage = async (channelId: EntityId, messageId: EntityId) => {
    await messageService.deleteMessage(channelId, messageId);
    messages.value = messages.value.filter(m => m.id !== messageId);
  };

  // SignalR Event Handlers
  const addMessage = (message: MessageDto) => {
    if (currentChannel.value?.id === message.channelId) {
      messages.value.push(message);
    }
  };

  const updateMessage = (message: MessageDto) => {
    const index = messages.value.findIndex(m => m.id === message.id);
    if (index !== -1) {
      messages.value[index] = message;
    }
  };

  const removeMessage = (channelId: EntityId, messageId: EntityId) => {
    if (currentChannel.value?.id === channelId) {
      messages.value = messages.value.filter(m => m.id !== messageId);
    }
  };

  const setUserOnline = (userId: EntityId) => {
    onlineUsers.value.add(userId);
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      //member.isOnline = true;
    }
  };

  const setUserOffline = (userId: EntityId) => {
    onlineUsers.value.delete(userId);
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      //member.isOnline = false;
    }
  };

  const addTypingUser = (channelId: EntityId, userId: EntityId) => {
    if (!typingUsers.value.has(channelId)) {
      typingUsers.value.set(channelId, new Set());
    }
    typingUsers.value.get(channelId)!.add(userId);
  };

  const removeTypingUser = (channelId: EntityId, userId: EntityId) => {
    typingUsers.value.get(channelId)?.delete(userId);
  };

  const getTypingUsersInChannel = (channelId: EntityId): EntityId[] => {
    return Array.from(typingUsers.value.get(channelId) || []);
  };

  const updateServerInfo = (server: Partial<ServerDetailDto>) => {
    if (currentServer.value && currentServer.value.id === server.id) {
      currentServer.value = { ...currentServer.value, ...server };
    }
    const serverIndex = servers.value.findIndex(s => s.id === server.id);
    if (serverIndex !== -1) {
      servers.value[serverIndex] = { ...servers.value[serverIndex], ...server };
    }
  };

  const addUserToVoiceChannel = (channelId: EntityId, user: UserProfileDto) => {
    if (!voiceChannelUsers.value.has(channelId)) {
      voiceChannelUsers.value.set(channelId, []);
    }
    const users = voiceChannelUsers.value.get(channelId)!;
    if (!users.find(u => u.id === user.id)) {
      users.push(user);
    }
  };

  const removeUserFromVoiceChannel = (channelId: EntityId, userId: EntityId) => {
    const users = voiceChannelUsers.value.get(channelId);
    if (users) {
      voiceChannelUsers.value.set(
        channelId,
        users.filter(u => u.id !== userId)
      );
    }
  };

  const setUserScreenShare = (channelId: EntityId, userId: EntityId, isSharing: boolean) => {
    if (!screenShares.value.has(channelId)) {
      screenShares.value.set(channelId, new Set());
    }
    if (isSharing) {
      screenShares.value.get(channelId)!.add(userId);
    } else {
      screenShares.value.get(channelId)!.delete(userId);
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

  return {
    // State
    servers,
    currentServer,
    currentChannel,
    messages,
    members,
    onlineUsers,
    typingUsers,
    voiceChannelUsers,
    screenShares,
    loading,
    error,
    isCreateChannelModalOpen,
    createChannelForServerId,

    // Computed
    currentUserId,

    // Server Actions
    fetchServers,
    fetchServer,
    fetchServerMembers,
    createServer,
    updateServer,
    deleteServer,
    leaveServer,
    generateInvite,

    // Channel Actions
    fetchChannel,
    createChannel,
    updateChannel,
    deleteChannel,

    // Message Actions
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,

    // SignalR Event Handlers
    addMessage,
    updateMessage,
    removeMessage,
    setUserOnline,
    setUserOffline,
    addTypingUser,
    removeTypingUser,
    getTypingUsersInChannel,
    updateServerInfo,
    addUserToVoiceChannel,
    removeUserFromVoiceChannel,
    setUserScreenShare,

    // Modal Actions
    openCreateChannelModal,
    closeCreateChannelModal,

    // Reset
    $reset: () => {
      servers.value = [];
      currentServer.value = null;
      currentChannel.value = null;
      messages.value = [];
      members.value = [];
      onlineUsers.value.clear();
      typingUsers.value.clear();
      voiceChannelUsers.value.clear();
      screenShares.value.clear();
      error.value = null;
    },
  };
});