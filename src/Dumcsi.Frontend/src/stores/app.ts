import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ServerListItemDto,
  ServerDetailDto,
  ChannelDetailDto,
  ChannelListItemDto, // Hozzáadva
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
  CreateInviteRequestDto,
  MessageDeletedPayload,    // Hozzáadva
  UserServerPayload,        // Hozzáadva
  ChannelDeletedPayload,    // Hozzáadva
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

  const fetchMoreMessages = async (channelId: EntityId, before?: EntityId) => {
    const result = await handleApiCall('messages', () => 
      messageService.getMessages(channelId, { before, limit: 50 })
    );
    if (result) {
      messages.value = [...result, ...messages.value];
    }
  };

  const sendMessage = async (channelId: EntityId, payload: CreateMessageRequestDto) => {
    // A sendMessage most már nem ad vissza üzenetet, mert a SignalR kezeli
    await messageService.sendMessage(channelId, payload);
  };

  const editMessage = async (channelId: EntityId, messageId: EntityId, payload: UpdateMessageRequestDto) => {
    await messageService.editMessage(channelId, messageId, payload);
    // Az állapotfrissítést a SignalR esemény végzi
  };

  const deleteMessage = async (channelId: EntityId, messageId: EntityId) => {
    await messageService.deleteMessage(channelId, messageId);
    // Az állapotfrissítést a SignalR esemény végzi
  };

  // --- SignalR Event Handlers ---

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
    if (currentChannel.value?.id === payload.channelId) {
      messages.value = messages.value.filter(m => m.id !== payload.messageId);
    }
  };

  const handleUserUpdated = (user: UserProfileDto) => {
    // Frissíti a bejelentkezett felhasználó adatait
    const authStore = useAuthStore();
    if (authStore.user?.id === user.id) {
      authStore.updateUserData(user);
    }
    // Frissíti a member listában lévő felhasználót
    members.value = members.value.map(m =>
      m.userId === user.id ? { ...m, username: user.username, serverNickname: user.globalNickname, avatar: user.avatar } : m
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

  const handleServerUpdated = (server: ServerListItemDto) => {
    const index = servers.value.findIndex(s => s.id === server.id);
    if (index !== -1) {
      servers.value[index] = { ...servers.value[index], ...server };
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
        // Frissítjük a member count-ot és a member listát, ha az adatok rendelkezésre állnak
        currentServer.value.memberCount++;
        // Ideális esetben a payload tartalmazza az új tag adatait
        // Ha nem, akkor újra le kellene kérni a tagokat.
        // A jelenlegi UserServerPayload nem tartalmazza, így csak a számot növeljük.
    }
    const serverIndex = servers.value.findIndex(s => s.id === payload.serverId);
    if (serverIndex !== -1) {
        servers.value[serverIndex].memberCount++;
    }
  }

  const handleUserLeftServer = (payload: UserServerPayload) => {
      if (currentServer.value?.id === payload.serverId) {
          currentServer.value.memberCount--;
          members.value = members.value.filter(m => m.userId !== payload.user.id);
      }
      const serverIndex = servers.value.findIndex(s => s.id === payload.serverId);
      if (serverIndex !== -1) {
          servers.value[serverIndex].memberCount--;
      }
  }

  const handleUserKickedFromServer = (payload: UserServerPayload) => {
    // Ugyanaz a logika mint a UserLeftServer esetén, de a toast üzenetet a signalrHandlers.ts kezeli
    handleUserLeftServer(payload);
  }

  const handleUserBannedFromServer = (payload: UserServerPayload) => {
    // Ugyanaz a logika mint a UserLeftServer esetén, de a toast üzenetet a signalrHandlers.ts kezeli
    handleUserLeftServer(payload);
  }
  
  const handleChannelCreated = (serverId: EntityId, channel: ChannelListItemDto) => {
    if(currentServer.value?.id === serverId) {
        currentServer.value.channels.push(channel);
    }
  };
  
  const handleChannelUpdated = (channel: ChannelListItemDto) => {
    if (currentServer.value) {
        const index = currentServer.value.channels.findIndex(c => c.id === channel.id);
        if (index !== -1) {
            currentServer.value.channels[index] = { ...currentServer.value.channels[index], ...channel };
        }
    }
    if (currentChannel.value?.id === channel.id) {
        currentChannel.value = { ...currentChannel.value, ...channel };
    }
  };
  
  const handleChannelDeleted = (payload: ChannelDeletedPayload) => {
    if (currentServer.value?.id === payload.serverId) {
        currentServer.value.channels = currentServer.value.channels.filter(c => c.id !== payload.channelId);
        if (currentChannel.value?.id === payload.channelId) {
            router.push(`/servers/${payload.serverId}`);
        }
    }
  };
  
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

    // Message Actions
    fetchMessages,
    fetchMoreMessages,
    sendMessage,
    editMessage,
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
      error.value = null;
    },
  };
});