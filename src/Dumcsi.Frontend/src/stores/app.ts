import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  ChannelDeletedPayload,
  ChannelDetailDto,
  CreateChannelRequest,
  CreateInviteRequest,
  CreateMessageRequest,
  CreateServerRequest,
  EntityId,
  MessageDeletedPayload,
  MessageDto,
  ServerDetails,
  ServerListItem,
  ServerListItemDto,
  ServerMember,
  UpdateChannelRequest,
  UpdateMessageRequest,
  UpdateServerRequest,
  UserProfileDto,
  UserServerPayload,
  UserTypingPayload,
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';
import router from '@/router';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from './auth';

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<ServerListItem[]>([]);
  const currentServer = ref<ServerDetails | null>(null);
  const currentChannel = ref<ChannelDetailDto | null>(null);
  const messages = ref<MessageDto[]>([]);
  const members = ref<ServerMember[]>([]);
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

  const createServer = async (payload: CreateServerRequest) => {
    const result = await serverService.createServer(payload);
    await fetchServers();
    await router.push(`/servers/${result.serverId}`);
    return result;
  };

  const updateServer = async (serverId: EntityId, payload: UpdateServerRequest) => {
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

  const generateInvite = async (serverId: EntityId, payload?: CreateInviteRequest) => {
    return await serverService.generateInvite(serverId, payload);
  };

  const joinServerWithInvite = async (inviteCode: string) => {
    return await serverService.joinServer(inviteCode);
  };

  const joinPublicServer = async (serverId: EntityId) => {
    return await serverService.joinPublicServer(serverId);
  };

  // Channel Actions
  const fetchChannel = async (channelId: EntityId) => {
    const result = await handleApiCall('channel', () => channelService.getChannel(channelId));
    if (result) {
      currentChannel.value = result;
      await fetchMessages(channelId);
    }
  };

  const updateCurrentChannelDetails = (details: Partial<ChannelDetailDto>) => {
    if (currentChannel.value) {
      currentChannel.value = { ...currentChannel.value, ...details };
    }
  };

  const createChannel = async (serverId: EntityId, payload: CreateChannelRequest) => {
    const result = await serverService.createChannel(serverId, payload);
    await fetchServer(serverId);
    return result;
  };

  const updateChannel = async (channelId: EntityId, payload: UpdateChannelRequest) => {
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
      const firstChannel = currentServer.value.channels?.find(ch => ch.type === 0);
      if (firstChannel) {
        await router.push(`/servers/${currentServer.value.id}/channels/${firstChannel.id}`);
      } else {
        await router.push(`/servers/${currentServer.value.id}`);
      }
    }
  };

  // Message Actions
  const fetchMessages = async (channelId: EntityId) => {
    const result = await handleApiCall('messages', () => messageService.getMessages(channelId));
    if (result) messages.value = result;
  };

  const sendMessage = async (channelId: EntityId, payload: CreateMessageRequest) => {
    return await messageService.sendMessage(channelId, payload);
  };

  const updateMessage = async (channelId: EntityId, messageId: EntityId, payload: UpdateMessageRequest) => {
    await messageService.editMessage(channelId, messageId, payload);
  };

  const deleteMessage = async (channelId: EntityId, messageId: EntityId) => {
    await messageService.deleteMessage(channelId, messageId);
    messages.value = messages.value.filter(m => m.id !== messageId);
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

  const handleUserUpdated = (user: UserProfileDto) => {
    const member = members.value.find(m => m.userId === user.id);
    if (member) {
      member.username = user.username;
      member.avatarUrl = user.avatar;
    }
  };

  const handleUserOnline = (userId: EntityId) => {
    onlineUsers.value.add(userId);
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      member.isOnline = true;
    }
  };

  const handleUserOffline = (userId: EntityId) => {
    onlineUsers.value.delete(userId);
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      member.isOnline = false;
    }
  };

  const handleUserTyping = (channelId: EntityId, userId: EntityId) => {
    if (!typingUsers.value.has(channelId)) {
      typingUsers.value.set(channelId, new Set());
    }
    typingUsers.value.get(channelId)!.add(userId);
  };

  const handleUserStoppedTyping = (channelId: EntityId, userId: EntityId) => {
    const channelTypingUsers = typingUsers.value.get(channelId);
    if (channelTypingUsers) {
      channelTypingUsers.delete(userId);
      if (channelTypingUsers.size === 0) {
        typingUsers.value.delete(channelId);
      }
    }
  };

  const handleServerUpdated = (server: ServerListItemDto) => {
    const index = servers.value.findIndex(s => s.id === server.id);
    if (index !== -1) {
      servers.value[index] = {
        id: server.id,
        name: server.name,
        icon: server.icon,
        memberCount: server.memberCount,
        isOwner: server.isOwner,
        description: server.description,
        public: server.public,
      };
    }
    if (currentServer.value?.id === server.id) {
      fetchServer(server.id);
    }
  };

  const handleServerDeleted = (serverId: EntityId) => {
    servers.value = servers.value.filter(s => s.id !== serverId);
    if (currentServer.value?.id === serverId) {
      currentServer.value = null;
      router.push('/servers');
    }
  };

  const handleUserJoinedServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId && payload.user) {
      const newMember: ServerMember = {
        userId: payload.user.id,
        username: payload.user.username,
        serverNickname: null,
        avatarUrl: payload.user.avatar,
        roles: [],
        isOnline: onlineUsers.value.has(payload.user.id),
      };
      members.value.push(newMember);
    }
  };

  const handleUserLeftServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      members.value = members.value.filter(m => m.userId !== payload.userId);
    }
  };

  const handleUserKickedFromServer = (payload: UserServerPayload) => {
    handleUserLeftServer(payload);
    if (payload.userId === currentUserId.value) {
      servers.value = servers.value.filter(s => s.id !== payload.serverId);
      if (currentServer.value?.id === payload.serverId) {
        currentServer.value = null;
        router.push('/servers');
      }
    }
  };

  const handleUserBannedFromServer = (payload: UserServerPayload) => {
    handleUserKickedFromServer(payload);
  };

  const handleChannelCreated = (channel: ChannelDetailDto) => {
    if (currentServer.value?.id === channel.serverId) {
      currentServer.value.channels.push({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      });
    }
  };

  const handleChannelUpdated = (channel: ChannelDetailDto) => {
    if (currentServer.value) {
      const index = currentServer.value.channels.findIndex(c => c.id === channel.id);
      if (index !== -1) {
        currentServer.value.channels[index] = {
          id: channel.id,
          name: channel.name,
          type: channel.type,
        };
      }
    }
    if (currentChannel.value?.id === channel.id) {
      currentChannel.value = channel;
    }
  };

  const handleChannelDeleted = (payload: ChannelDeletedPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      currentServer.value.channels = currentServer.value.channels.filter(
          c => c.id !== payload.channelId
      );
    }
    if (currentChannel.value?.id === payload.channelId) {
      currentChannel.value = null;
      if (currentServer.value) {
        const firstChannel = currentServer.value.channels.find(c => c.type === 0);
        if (firstChannel) {
          router.push(`/servers/${currentServer.value.id}/channels/${firstChannel.id}`);
        } else {
          router.push(`/servers/${currentServer.value.id}`);
        }
      }
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
    joinServerWithInvite,
    joinPublicServer,

    // Channel Actions
    fetchChannel,
    updateCurrentChannelDetails,
    createChannel,
    updateChannel,
    deleteChannel,
    openCreateChannelModal,
    closeCreateChannelModal,

    // Message Actions
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,

    // SignalR Event Handlers
    handleReceiveMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleUserUpdated,
    handleUserOnline,
    handleUserOffline,
    handleUserTyping,
    handleUserStoppedTyping,
    handleServerUpdated,
    handleServerDeleted,
    handleUserJoinedServer,
    handleUserLeftServer,
    handleUserKickedFromServer,
    handleUserBannedFromServer,
    handleChannelCreated,
    handleChannelUpdated,
    handleChannelDeleted,

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