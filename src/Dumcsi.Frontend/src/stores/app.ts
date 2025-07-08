import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ServerListItem,
  ServerDetail,
  ChannelDetail,
  MessageListItem,
  MessageDto,
  ServerMember,
  CreateServerPayload,
  UpdateServerPayload,
  CreateChannelPayload,
  UpdateChannelPayload,
  CreateMessagePayload,
  UpdateMessagePayload,
  EntityId,
  UserDto,
  ServerDto,
  ChannelDto,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';
import inviteService from '@/services/inviteService';
import router from '@/router';
import { useAuthStore } from './auth';

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<ServerListItem[]>([]);
  const currentServer = ref<ServerDetail | null>(null);
  const currentChannel = ref<ChannelDetail | null>(null);
  const messages = ref<MessageListItem[]>([]);
  const members = ref<ServerMember[]>([]);
  const onlineUsers = ref<Set<EntityId>>(new Set());
  const typingUsers = ref<Map<EntityId, Set<EntityId>>>(new Map());
  const voiceChannelUsers = ref<Map<EntityId, UserDto[]>>(new Map());
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
      return null;
    } finally {
      loading.value[loadingKey] = false;
    }
  };

  // Server Actions
  const fetchServers = async () => {
    const response = await handleApiCall('servers', () => serverService.getServers());
    if (response) servers.value = response.data;
  };

  const fetchServer = async (serverId: EntityId) => {
    const response = await handleApiCall('server', () => serverService.getServer(serverId));
    if (response) {
      currentServer.value = response.data;
      await fetchServerMembers(serverId);
    }
  };

  const fetchServerMembers = async (serverId: EntityId) => {
    const response = await handleApiCall('members', () => serverService.getServerMembers(serverId));
    if (response) members.value = response.data;
  };

  const createServer = async (payload: CreateServerPayload) => {
    const response = await serverService.createServer(payload);
    await fetchServers();
    await router.push(`/servers/${response.data.id}`);
    return response.data;
  };

  const updateServer = async (serverId: EntityId, payload: UpdateServerPayload) => {
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

    /**
   * Joins a server using an invite code.
   * @param inviteCode The invite code to use.
   */
  const joinServerWithInvite = async (inviteCode: string) => {
    const response = await inviteService.joinServerWithInvite(inviteCode);
    await fetchServers(); // Refresh server list
    return response.data;
  };

  /**
   * Joins a public server by its ID.
   * @param serverId The ID of the public server to join.
   */
  const joinPublicServer = async (serverId: EntityId) => {
    const response = await serverService.joinPublicServer(serverId);
    await fetchServers(); // Refresh server list
    return response.data;
  };

  // Channel Actions
  const fetchChannel = async (channelId: EntityId) => {
    const response = await handleApiCall('channel', () => channelService.getChannel(channelId));
    if (response) {
      currentChannel.value = response.data;
      await fetchMessages(channelId);
    }
  };

  const createChannel = async (serverId: EntityId, payload: CreateChannelPayload) => {
    const response = await channelService.createChannel(serverId, payload);
    await fetchServer(serverId);
    return response.data;
  };

  const updateChannel = async (channelId: EntityId, payload: UpdateChannelPayload) => {
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
      }
    }
  };

  // Message Actions
  const fetchMessages = async (channelId: EntityId) => {
    const response = await handleApiCall('messages', () => 
      messageService.getMessages(channelId, { limit: 50 })
    );
    if (response) messages.value = response.data;
  };

  const fetchMoreMessages = async (channelId: EntityId, beforeId: EntityId) => {
    const response = await messageService.getMessages(channelId, { 
      before: beforeId, 
      limit: 50 
    });
    messages.value = [...response.data, ...messages.value];
  };

  const sendMessage = async (channelId: EntityId, payload: CreateMessagePayload) => {
    const response = await messageService.sendMessage(channelId, payload);
    // SignalR will handle adding the message to the list
    return response.data;
  };

  const editMessage = async (messageId: EntityId, payload: UpdateMessagePayload) => {
    await messageService.updateMessage(messageId, payload);
    // SignalR will handle updating the message
  };

  const deleteMessage = async (messageId: EntityId) => {
    await messageService.deleteMessage(messageId);
    // SignalR will handle removing the message
  };

  // SignalR Event Handlers
  const handleReceiveMessage = (message: MessageDto) => {
    if (currentChannel.value?.id === message.channelId) {
      messages.value.push(message);
    }
  };

  const handleMessageUpdated = (message: MessageDto) => {
    const index = messages.value.findIndex(m => m.id === message.id);
    if (index !== -1) {
      messages.value[index] = message;
    }
  };

  const handleMessageDeleted = (payload: MessageDeletedPayload) => {
    messages.value = messages.value.filter(m => m.id !== payload.messageId);
  };

  const handleUserUpdated = (user: UserDto) => {
    const member = members.value.find(m => m.userId === user.id);
    if (member) {
      member.username = user.username;
      member.profilePictureUrl = user.profilePictureUrl;
    }
  };

  const handleUserOnline = (userId: EntityId) => {
    onlineUsers.value.add(userId);
  };

  const handleUserOffline = (userId: EntityId) => {
    onlineUsers.value.delete(userId);
  };

  const handleUserTyping = (channelId: EntityId, userId: EntityId) => {
    if (!typingUsers.value.has(channelId)) {
      typingUsers.value.set(channelId, new Set());
    }
    typingUsers.value.get(channelId)!.add(userId);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      handleUserStoppedTyping(channelId, userId);
    }, 3000);
  };

  const handleUserStoppedTyping = (channelId: EntityId, userId: EntityId) => {
    typingUsers.value.get(channelId)?.delete(userId);
  };

  const handleServerCreated = (server: ServerDto) => {
    servers.value.push(server);
  };

  const handleServerUpdated = (server: ServerDto) => {
    const index = servers.value.findIndex(s => s.id === server.id);
    if (index !== -1) {
      servers.value[index] = server;
    }
    if (currentServer.value?.id === server.id) {
      currentServer.value = { ...currentServer.value, ...server };
    }
  };

  const handleServerDeleted = (serverId: EntityId) => {
    servers.value = servers.value.filter(s => s.id !== serverId);
    if (currentServer.value?.id === serverId) {
      router.push('/servers');
    }
  };

  const handleUserJoinedServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      fetchServerMembers(payload.serverId);
    }
  };

  const handleUserLeftServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      members.value = members.value.filter(m => m.userId !== payload.userId);
    }
  };

  const handleUserKickedFromServer = (payload: UserServerPayload) => {
    if (payload.userId === currentUserId.value) {
      servers.value = servers.value.filter(s => s.id !== payload.serverId);
      if (currentServer.value?.id === payload.serverId) {
        router.push('/servers');
      }
    } else if (currentServer.value?.id === payload.serverId) {
      members.value = members.value.filter(m => m.userId !== payload.userId);
    }
  };

  const handleUserBannedFromServer = (payload: UserServerPayload) => {
    handleUserKickedFromServer(payload);
  };

  const handleChannelCreated = (serverId: EntityId, channel: ChannelDto) => {
    if (currentServer.value?.id === serverId) {
      currentServer.value.channels.push(channel);
    }
  };

  const handleChannelUpdated = (channel: ChannelDto) => {
    if (currentServer.value) {
      const index = currentServer.value.channels.findIndex(c => c.id === channel.id);
      if (index !== -1) {
        currentServer.value.channels[index] = channel;
      }
    }
    if (currentChannel.value?.id === channel.id) {
      currentChannel.value = { ...currentChannel.value, ...channel };
    }
  };

  const handleChannelDeleted = (payload: ChannelDeletedPayload) => {
    if (currentServer.value) {
      currentServer.value.channels = currentServer.value.channels.filter(
        c => c.id !== payload.channelId
      );
    }
    if (currentChannel.value?.id === payload.channelId) {
      router.push(`/servers/${payload.serverId}`);
    }
  };

  const handleUserJoinedVoiceChannel = (channelId: EntityId, user: UserDto) => {
    if (!voiceChannelUsers.value.has(channelId)) {
      voiceChannelUsers.value.set(channelId, []);
    }
    voiceChannelUsers.value.get(channelId)!.push(user);
  };

  const handleUserLeftVoiceChannel = (channelId: EntityId, userId: EntityId) => {
    const users = voiceChannelUsers.value.get(channelId);
    if (users) {
      voiceChannelUsers.value.set(
        channelId,
        users.filter(u => u.id !== userId)
      );
    }
  };

  const handleUserStartedScreenShare = (channelId: EntityId, userId: EntityId) => {
    if (!screenShares.value.has(channelId)) {
      screenShares.value.set(channelId, new Set());
    }
    screenShares.value.get(channelId)!.add(userId);
  };

  const handleUserStoppedScreenShare = (channelId: EntityId, userId: EntityId) => {
    screenShares.value.get(channelId)?.delete(userId);
  };

  // Modal Actions
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
    currentUserId,

    // Server Actions
    fetchServers,
    fetchServer,
    createServer,
    updateServer,
    deleteServer,
    leaveServer,
    joinServerWithInvite,

    // Channel Actions
    fetchChannel,
    createChannel,
    updateChannel,
    deleteChannel,

    // Message Actions
    fetchMessages,
    fetchMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,

    // SignalR Handlers
    handleReceiveMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleUserUpdated,
    handleUserOnline,
    handleUserOffline,
    handleUserTyping,
    handleUserStoppedTyping,
    handleServerCreated,
    handleServerUpdated,
    handleServerDeleted,
    handleUserJoinedServer,
    handleUserLeftServer,
    handleUserKickedFromServer,
    handleUserBannedFromServer,
    handleChannelCreated,
    handleChannelUpdated,
    handleChannelDeleted,
    handleUserJoinedVoiceChannel,
    handleUserLeftVoiceChannel,
    handleUserStartedScreenShare,
    handleUserStoppedScreenShare,

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
      isCreateChannelModalOpen.value = false;
      createChannelForServerId.value = null;
    }
  };
});