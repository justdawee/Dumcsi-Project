import {defineStore} from 'pinia';
import {computed, ref} from 'vue';
import type {
  ChannelDeletedPayload,
  ChannelDetailDto,
  ChannelListItemDto,
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
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';
import router from '@/router';
import {useToast} from '@/composables/useToast';
import {useAuthStore} from './auth';

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<ServerListItem[]>([]);
  const currentServer = ref<ServerDetails | null>(null);
  const currentChannel = ref<ChannelDetailDto | null>(null);
  const messages = ref<MessageDto[]>([]);
  const members = ref<ServerMember[]>([]);
  const onlineUsers = ref<Set<EntityId>>(new Set());
  const typingUsers = ref<Map<EntityId, Set<EntityId>>>(new Map()); // Key: channelId, Value: Set of userIds
  const voiceChannelUsers = ref<Map<EntityId, UserProfileDto[]>>(new Map()); // Key: channelId, Value: Array of Users
  const screenShares = ref<Map<EntityId, Set<EntityId>>>(new Map()); // Key: channelId, Value: Set of userIds

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
  }

  const joinPublicServer = async (serverId: EntityId) => {
    return await serverService.joinPublicServer(serverId);
  }

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
  }

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
  const handleMessageCreated = (message: MessageDto) => {
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


  const handleReceiveMessage = (message: MessageDto) => {
    if (currentChannel.value?.id === message.channelId) {
      messages.value.push(message);
    }
  };

  const handleChannelCreated = (serverId: EntityId, channel: ChannelListItemDto) => {
    if (currentServer.value?.id === serverId) {
      currentServer.value.channels.push(channel);
    }
  };

  const handleChannelUpdated = (channel: ChannelListItemDto) => {
    if (currentServer.value) {
      const index = currentServer.value.channels.findIndex(ch => ch.id === channel.id);
      if (index !== -1) {
        // Konvertáljuk a megfelelő típusra
        currentServer.value.channels[index] = {
          id: channel.id,
          name: channel.name,
          type: channel.type
        };
      }
    }
    // Ha ez az aktuális csatorna, frissítsük
    if (currentChannel.value?.id === channel.id) {
      fetchChannel(channel.id);
    }
  };

  const handleChannelDeleted = (payload: ChannelDeletedPayload) => {
    if (currentServer.value) {
      currentServer.value.channels = currentServer.value.channels.filter(
          ch => ch.id !== payload.channelId
      );
    }
    if (currentChannel.value?.id === payload.channelId) {
      currentChannel.value = null;
      router.push(`/servers/${currentServer.value?.id}`);
    }
  };

  const handleUserUpdated = (user: UserProfileDto) => {
    members.value = members.value.map(m =>
        m.userId === user.id
            ? { ...m, username: user.username, serverNickname: user.globalNickname, avatar: user.avatar }
            : m
    );
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
  };

  const handleUserStoppedTyping = (channelId: EntityId, userId: EntityId) => {
    typingUsers.value.get(channelId)?.delete(userId);
  };

  const handleUserPresenceChanged = (userId: EntityId, isOnline: boolean) => {
    if (isOnline) {
      onlineUsers.value.add(userId);
    } else {
      onlineUsers.value.delete(userId);
    }

    // Update member online status
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      member.isOnline = isOnline;
    }
  };

  const handleUserKickedFromServer = (payload: UserServerPayload) => {
    if (payload.userId === currentUserId.value && currentServer.value?.id === payload.serverId) {
      servers.value = servers.value.filter(s => s.id !== payload.serverId);
      router.push('/servers');
      addToast({
        type: 'warning',
        title: 'Kicked from Server',
        message: 'You have been kicked from the server.',
        duration: 5000
      });
    } else if (currentServer.value?.id === payload.serverId) {
      currentServer.value.memberCount--;
      members.value = members.value.filter(m => m.userId !== payload.userId);
    }
  };

  const handleUserBannedFromServer = (payload: UserServerPayload) => {
    if (payload.userId === currentUserId.value && currentServer.value?.id === payload.serverId) {
      servers.value = servers.value.filter(s => s.id !== payload.serverId);
      router.push('/servers');
      addToast({
        type: 'danger',
        title: 'Banned from Server',
        message: 'You have been banned from the server.',
        duration: 5000
      });
    } else if (currentServer.value?.id === payload.serverId) {
      currentServer.value.memberCount--;
      members.value = members.value.filter(m => m.userId !== payload.userId);
    }
  };

  const handleServerUpdated = (serverDto: ServerListItemDto) => {
    const index = servers.value.findIndex(s => s.id === serverDto.id);
    if (index !== -1) {
      // Konvertáljuk View Model típusra
      servers.value[index] = {
        id: serverDto.id,
        name: serverDto.name,
        icon: serverDto.icon,
        memberCount: serverDto.memberCount,
        isOwner: serverDto.isOwner,
        description: serverDto.description,
        public: serverDto.public
      };
    }
    if (currentServer.value?.id === serverDto.id) {
      currentServer.value = {
        ...currentServer.value,
        name: serverDto.name,
        icon: serverDto.icon,
        memberCount: serverDto.memberCount,
        description: serverDto.description,
        public: serverDto.public
      };
    }
  };

  const handleServerDeleted = (serverId: EntityId) => {
    servers.value = servers.value.filter(s => s.id !== serverId);
    if (currentServer.value?.id === serverId) {
      router.push('/servers');
    }
  };

  const handleUserJoinedServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId && payload.user) {
      // Frissítjük a member count-ot
      currentServer.value.memberCount++;
      // Hozzáadjuk az új tagot a listához (View Model típussal)
      const newMember: ServerMember = {
        userId: payload.user.id,
        username: payload.user.username,
        serverNickname: null,
        avatarUrl: payload.user.avatar,
        roles: [],
        isOnline: false
      };
      members.value.push(newMember);
    }
  };

  const handleUserLeftServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      currentServer.value.memberCount--;
      members.value = members.value.filter(m => m.userId !== payload.userId);

      // Ha mi hagytuk el a szervert
      if (payload.userId === currentUserId.value) {
        servers.value = servers.value.filter(s => s.id !== payload.serverId);
        router.push('/servers');
      }
    }
  };

  // Voice related handlers
  const handleUserJoinedVoiceChannel = (channelId: EntityId, user: UserProfileDto) => {
    if (!voiceChannelUsers.value.has(channelId)) {
      voiceChannelUsers.value.set(channelId, []);
    }
    const users = voiceChannelUsers.value.get(channelId)!;
    if (!users.find(u => u.id === user.id)) {
      users.push(user);
    }
  };

  const handleUserLeftVoiceChannel = (channelId: EntityId, userId: EntityId) => {
    const users = voiceChannelUsers.value.get(channelId);
    if (users) {
      const filtered = users.filter(u => u.id !== userId);
      if (filtered.length === 0) {
        voiceChannelUsers.value.delete(channelId);
      } else {
        voiceChannelUsers.value.set(channelId, filtered);
      }
    }
    // Also remove from screen shares
    screenShares.value.get(channelId)?.delete(userId);
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

  // Helpers
  const getTypingUsersInChannel = (channelId: EntityId): EntityId[] => {
    return Array.from(typingUsers.value.get(channelId) || []).filter(
        userId => userId !== currentUserId.value
    );
  };

  const getUsersInVoiceChannel = (channelId: EntityId): UserProfileDto[] => {
    return voiceChannelUsers.value.get(channelId) || [];
  };

  const isUserSharingScreen = (channelId: EntityId, userId: EntityId): boolean => {
    return screenShares.value.get(channelId)?.has(userId) || false;
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
    currentUserId,
    isCreateChannelModalOpen,
    createChannelForServerId,

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
    createChannel,
    updateChannel,
    deleteChannel,
    updateCurrentChannelDetails,

    // Message Actions
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,

    // SignalR Event Handlers
    handleMessageCreated,
    handleMessageUpdated,
    handleMessageDeleted,
    handleReceiveMessage,
    handleChannelCreated,
    handleChannelUpdated,
    handleChannelDeleted,
    handleUserUpdated,
    handleUserOnline,
    handleUserOffline,
    handleUserTyping,
    handleUserStoppedTyping,
    handleUserPresenceChanged,
    handleUserKickedFromServer,
    handleUserBannedFromServer,
    handleServerUpdated,
    handleServerDeleted,
    handleUserJoinedServer,
    handleUserLeftServer,
    handleUserJoinedVoiceChannel,
    handleUserLeftVoiceChannel,
    handleUserStartedScreenShare,
    handleUserStoppedScreenShare,

    // Helpers
    getTypingUsersInChannel,
    getUsersInVoiceChannel,
    isUserSharingScreen,
    openCreateChannelModal,
    closeCreateChannelModal,
  };
});