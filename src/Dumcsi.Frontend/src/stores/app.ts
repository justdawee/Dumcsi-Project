import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import type { AxiosError, AxiosResponse } from 'axios';
import type {
  ServerListItem,
  ServerDetail,
  ChannelDetail,
  MessageListItem,
  MessageDto,
  ServerMember,
  CreateServerPayload,
  CreateChannelPayload,
  CreateMessagePayload,
  UpdateMessagePayload,
  EntityId,
  UserDto,
  ServerDto,
  ChannelDto,
  RoleDto,
  EmojiDto,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
  EmojiDeletedPayload,
  MemberRolesUpdatedPayload,
  ReactionPayload,
  VoiceChannelPayload,
  WebRTCSignalPayload,
  ScreenSharePayload
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';
import router from '@/router';
import { useToast } from '@/composables/useToast';

export const useAppStore = defineStore('app', () => {
  // --- State ---
  const servers = ref<ServerListItem[]>([]);
  const currentServer = ref<ServerDetail | null>(null);
  const currentChannel = ref<ChannelDetail | null>(null);
  const messages = ref<MessageListItem[]>([]);
  const members = ref<ServerMember[]>([]);
  const onlineUsers = ref<Set<EntityId>>(new Set());
  const typingUsers = ref<Map<EntityId, Set<EntityId>>>(new Map()); // channelId -> Set of userIds
  const voiceChannelUsers = ref<Map<EntityId, UserDto[]>>(new Map()); // channelId -> users
  const screenShares = ref<Map<EntityId, Set<EntityId>>>(new Map()); // channelId -> Set of userIds sharing screen
  
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

  // --- Getters ---
  const currentServerChannels = computed(() => currentServer.value?.channels || []);
  const isUserOnline = (userId: EntityId) => onlineUsers.value.has(userId);
  const getTypingUsersInChannel = (channelId: EntityId) => Array.from(typingUsers.value.get(channelId) || []);
  const getVoiceChannelUsers = (channelId: EntityId) => voiceChannelUsers.value.get(channelId) || [];
  const getScreenSharesInChannel = (channelId: EntityId) => Array.from(screenShares.value.get(channelId) || []);

  // --- Private Helpers ---
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
  
  const resetCurrentData = () => {
    currentServer.value = null;
    currentChannel.value = null;
    messages.value = [];
    members.value = [];
  };

  // --- Server Actions ---
  const fetchServers = async () => {
    const result = await handleApiCall('servers', async () => {
      const response = await serverService.getServers();
      servers.value = response.data;
      return response.data;
    });
    return result;
  };

  const fetchServer = async (serverId: EntityId) => {
    const result = await handleApiCall('server', async () => {
      const [serverResponse, membersResponse] = await Promise.all([
        serverService.getServer(serverId),
        serverService.getServerMembers(serverId)
      ]);
      
      currentServer.value = serverResponse.data;
      members.value = membersResponse.data;
      return serverResponse.data;
    });
    return result;
  };

  const createServer = async (payload: CreateServerPayload) => {
    const response = await serverService.createServer(payload);
    await fetchServers();
    return response.data;
  };

  const updateServer = async (serverId: EntityId, payload: UpdateServerPayload) => {
    await serverService.updateServer(serverId, payload);
    await fetchServer(serverId);
  };

  const deleteServer = async (serverId: EntityId) => {
    await serverService.deleteServer(serverId);
    await fetchServers();
    resetCurrentData();
    router.push({ name: 'ServerSelect' });
  };

  const joinServer = async (inviteCode: string) => {
    const response = await serverService.joinServer(inviteCode);
    await fetchServers();
    return response.data;
  };

  const leaveServer = async (serverId: EntityId) => {
    await serverService.leaveServer(serverId);
    await fetchServers();
    if (currentServer.value?.id === serverId) {
      resetCurrentData();
      router.push({ name: 'ServerSelect' });
    }
  };

  // --- Channel Actions ---
  const fetchChannel = async (channelId: EntityId) => {
    const result = await handleApiCall('channel', async () => {
      const response = await channelService.getChannel(channelId);
      currentChannel.value = response.data;
      return response.data;
    });
    return result;
  };

  const createChannel = async (serverId: EntityId, payload: CreateChannelPayload) => {
    const response = await serverService.createChannel(serverId, payload);
    await fetchServer(serverId);
    return response.data;
  };

  const updateChannel = async (channelId: EntityId, payload: UpdateChannelPayload) => {
    await channelService.updateChannel(channelId, payload);
    if (currentServer.value) {
      await fetchServer(currentServer.value.id);
    }
  };

  const deleteChannel = async (channelId: EntityId) => {
    await channelService.deleteChannel(channelId);
    if (currentChannel.value?.id === channelId) {
      currentChannel.value = null;
      messages.value = [];
    }
    if (currentServer.value) {
      await fetchServer(currentServer.value.id);
    }
  };

  // --- Message Actions ---
  const fetchMessages = async (channelId: EntityId, before?: EntityId, limit: number = 50) => {
    const result = await handleApiCall('messages', async () => {
      const response = await messageService.getMessages(channelId, { before, limit });
      if (!before) {
        messages.value = response.data;
      } else {
        messages.value.unshift(...response.data);
      }
      return response.data;
    });
    return result;
  };

  const sendMessage = async (channelId: EntityId, payload: CreateMessagePayload) => {
    const response = await messageService.sendMessage(channelId, payload);
    messages.value.push(response.data);
    return response.data;
  };

  const updateMessage = async (channelId: EntityId, messageId: EntityId, payload: UpdateMessagePayload) => {
    await messageService.editMessage(channelId, messageId, payload);
    const messageIndex = messages.value.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      messages.value[messageIndex] = { ...messages.value[messageIndex], ...payload, editedAt: new Date().toISOString() };
    }
  };

  const deleteMessage = async (channelId: EntityId, messageId: EntityId) => {
    await messageService.deleteMessage(channelId, messageId);
    messages.value = messages.value.filter(m => m.id !== messageId);
  };

  // --- SignalR Event Handlers ---
  
  // Message Events
  const handleReceiveMessage = (message: MessageDto) => {
    if (currentChannel.value?.id === message.channelId) {
      // Check if message already exists (to prevent duplicates)
      const exists = messages.value.some(m => m.id === message.id);
      if (!exists) {
        messages.value.push(message);
      }
    }
  };

  const handleMessageUpdated = (updatedMessage: MessageDto) => {
    const index = messages.value.findIndex(m => m.id === updatedMessage.id);
    if (index !== -1) {
      messages.value[index] = updatedMessage;
    }
  };

  const handleMessageDeleted = (payload: MessageDeletedPayload) => {
    messages.value = messages.value.filter(m => m.id !== payload.messageId);
  };

  // Reaction Events
  const handleReactionAdded = (payload: ReactionPayload) => {
    const message = messages.value.find(m => m.id === payload.messageId);
    if (message) {
      // Update reactions (implementation depends on reaction structure)
      // This is a simplified example
      if (!message.reactions) message.reactions = [];
      const reaction = message.reactions.find(r => 
        (r.emojiId === payload.emojiId && !payload.emoji) || 
        (r.emoji === payload.emoji && !payload.emojiId)
      );
      if (reaction) {
        reaction.count++;
        reaction.hasReacted = true;
      } else {
        message.reactions.push({
          emojiId: payload.emojiId,
          emoji: payload.emoji,
          count: 1,
          users: [],
          hasReacted: true
        });
      }
    }
  };

  const handleReactionRemoved = (payload: ReactionPayload) => {
    const message = messages.value.find(m => m.id === payload.messageId);
    if (message && message.reactions) {
      const reaction = message.reactions.find(r => 
        (r.emojiId === payload.emojiId && !payload.emoji) || 
        (r.emoji === payload.emoji && !payload.emojiId)
      );
      if (reaction) {
        reaction.count--;
        if (reaction.count <= 0) {
          message.reactions = message.reactions.filter(r => r !== reaction);
        }
      }
    }
  };

  // User Events
  const handleUserOnline = (userId: EntityId) => {
    onlineUsers.value.add(userId);
    // Update member status if in members list
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      member.isOnline = true;
    }
  };

  const handleUserOffline = (userId: EntityId) => {
    onlineUsers.value.delete(userId);
    // Update member status if in members list
    const member = members.value.find(m => m.userId === userId);
    if (member) {
      member.isOnline = false;
    }
  };

  const handleUserUpdated = (user: UserDto) => {
    // Update user in members list
    const member = members.value.find(m => m.userId === user.id);
    if (member) {
      member.username = user.username;
      member.globalNickname = user.globalNickname;
      member.avatarUrl = user.avatarUrl;
    }
    
    // Update user in messages
    messages.value.forEach(message => {
      if (message.senderId === user.id) {
        message.senderUsername = user.username;
        message.senderGlobalNickname = user.globalNickname;
        message.senderAvatarUrl = user.avatarUrl;
      }
    });
    
    // Update in servers list if they're the owner
    servers.value.forEach(server => {
      if (server.ownerId === user.id) {
        // Update owner info if available
      }
    });
  };

  // Server Events
  const handleServerUpdated = (updatedServer: ServerDto) => {
    // Update in servers list
    const index = servers.value.findIndex(s => s.id === updatedServer.id);
    if (index !== -1) {
      servers.value[index] = { ...servers.value[index], ...updatedServer };
    }
    
    // Update current server if it's the one being viewed
    if (currentServer.value?.id === updatedServer.id) {
      currentServer.value = { ...currentServer.value, ...updatedServer };
    }
  };

  const handleServerDeleted = (serverId: EntityId) => {
    servers.value = servers.value.filter(s => s.id !== serverId);
    
    if (currentServer.value?.id === serverId) {
      const { addToast } = useToast();
      addToast({
        type: 'warning',
        message: 'The server you were viewing has been deleted',
        duration: 5000
      });
      resetCurrentData();
      router.push({ name: 'ServerSelect' });
    }
  };

  const handleUserJoinedServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      // Increment member count
      currentServer.value.memberCount++;
      
      // Add to members list if we have user data
      if (payload.user) {
        members.value.push({
          userId: payload.user.id,
          username: payload.user.username,
          globalNickname: payload.user.globalNickname,
          avatarUrl: payload.user.avatarUrl,
          role: 0, // Default to Member role
          joinedAt: new Date().toISOString(),
          isOnline: payload.user.isOnline
        });
      }
    }
    
    // Update server in list
    const server = servers.value.find(s => s.id === payload.serverId);
    if (server) {
      server.memberCount++;
    }
  };

  const handleUserLeftServer = (payload: UserServerPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      // Decrement member count
      currentServer.value.memberCount--;
      
      // Remove from members list
      members.value = members.value.filter(m => m.userId !== payload.userId);
    }
    
    // Update server in list
    const server = servers.value.find(s => s.id === payload.serverId);
    if (server) {
      server.memberCount--;
    }
  };

  // Channel Events
  const handleChannelCreated = (channel: ChannelDto) => {
    if (currentServer.value?.id === channel.serverId) {
      currentServer.value.channels.push({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        position: channel.position,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleChannelUpdated = (channel: ChannelDto) => {
    if (currentServer.value?.id === channel.serverId) {
      const index = currentServer.value.channels.findIndex(c => c.id === channel.id);
      if (index !== -1) {
        currentServer.value.channels[index] = {
          ...currentServer.value.channels[index],
          ...channel
        };
      }
    }
    
    // Update current channel if it's the one being viewed
    if (currentChannel.value?.id === channel.id) {
      currentChannel.value = { ...currentChannel.value, ...channel };
    }
  };

  const handleChannelDeleted = (payload: ChannelDeletedPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      currentServer.value.channels = currentServer.value.channels.filter(c => c.id !== payload.channelId);
    }
    
    if (currentChannel.value?.id === payload.channelId) {
      const { addToast } = useToast();
      addToast({
        type: 'warning',
        message: 'The channel you were viewing has been deleted',
        duration: 3000
      });
      currentChannel.value = null;
      messages.value = [];
      router.push({ name: 'Server', params: { serverId: payload.serverId } });
    }
  };

  // Role Events
  const handleRoleCreated = (role: RoleDto) => {
    if (currentServer.value?.id === role.serverId && currentServer.value.roles) {
      currentServer.value.roles.push(role);
    }
  };

  const handleRoleUpdated = (role: RoleDto) => {
    if (currentServer.value?.id === role.serverId && currentServer.value.roles) {
      const index = currentServer.value.roles.findIndex(r => r.id === role.id);
      if (index !== -1) {
        currentServer.value.roles[index] = role;
      }
    }
  };

  const handleRoleDeleted = (roleId: EntityId) => {
    if (currentServer.value?.roles) {
      currentServer.value.roles = currentServer.value.roles.filter(r => r.id !== roleId);
    }
  };

  const handleMemberRolesUpdated = (payload: MemberRolesUpdatedPayload) => {
    if (currentServer.value?.id === payload.serverId) {
      const member = members.value.find(m => m.userId === payload.userId);
      if (member) {
        member.roles = payload.roleIds;
      }
    }
  };

  // Emoji Events
  const handleEmojiCreated = (emoji: EmojiDto) => {
    if (currentServer.value?.id === emoji.serverId && currentServer.value.emojis) {
      currentServer.value.emojis.push(emoji);
    }
  };

  const handleEmojiDeleted = (payload: EmojiDeletedPayload) => {
    if (currentServer.value?.id === payload.serverId && currentServer.value.emojis) {
      currentServer.value.emojis = currentServer.value.emojis.filter(e => e.id !== payload.emojiId);
    }
  };

  // Voice/Video Events
  const handleUserJoinedVoice = (payload: VoiceChannelPayload) => {
    if (!voiceChannelUsers.value.has(payload.channelId)) {
      voiceChannelUsers.value.set(payload.channelId, []);
    }
    
    const users = voiceChannelUsers.value.get(payload.channelId)!;
    if (payload.user && !users.find(u => u.id === payload.user!.id)) {
      users.push(payload.user);
    }
  };

  const handleUserLeftVoice = (payload: VoiceChannelPayload) => {
    const users = voiceChannelUsers.value.get(payload.channelId);
    if (users) {
      const filtered = users.filter(u => u.id !== payload.userId);
      if (filtered.length > 0) {
        voiceChannelUsers.value.set(payload.channelId, filtered);
      } else {
        voiceChannelUsers.value.delete(payload.channelId);
      }
    }
  };

  const handleAllUsersInChannel = (users: UserDto[]) => {
    // This would be called when joining a voice channel to get all current users
    // Implementation depends on how the backend sends this data
  };

  // WebRTC Events
  const handleReceiveOffer = (payload: WebRTCSignalPayload) => {
    // Handle WebRTC offer - implementation depends on WebRTC setup
    console.log('Received WebRTC offer from user:', payload.fromUserId);
  };

  const handleReceiveAnswer = (payload: WebRTCSignalPayload) => {
    // Handle WebRTC answer - implementation depends on WebRTC setup
    console.log('Received WebRTC answer from user:', payload.fromUserId);
  };

  const handleReceiveIceCandidate = (payload: WebRTCSignalPayload) => {
    // Handle ICE candidate - implementation depends on WebRTC setup
    console.log('Received ICE candidate from user:', payload.fromUserId);
  };

  // Screen Share Events
  const handleUserStartedScreenShare = (payload: ScreenSharePayload) => {
    if (!screenShares.value.has(payload.channelId)) {
      screenShares.value.set(payload.channelId, new Set());
    }
    screenShares.value.get(payload.channelId)!.add(payload.userId);
  };

  const handleUserStoppedScreenShare = (payload: ScreenSharePayload) => {
    const shares = screenShares.value.get(payload.channelId);
    if (shares) {
      shares.delete(payload.userId);
      if (shares.size === 0) {
        screenShares.value.delete(payload.channelId);
      }
    }
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
    servers: readonly(servers),
    currentServer: readonly(currentServer),
    currentChannel: readonly(currentChannel),
    messages: readonly(messages),
    members: readonly(members),
    loading: readonly(loading),
    error: readonly(error),
    isCreateChannelModalOpen: readonly(isCreateChannelModalOpen),
    createChannelForServerId: readonly(createChannelForServerId),
    
    // Getters
    currentServerChannels,
    isUserOnline,
    getTypingUsersInChannel,
    getVoiceChannelUsers,
    getScreenSharesInChannel,
    
    // Server Actions
    fetchServers,
    fetchServer,
    createServer,
    updateServer,
    deleteServer,
    joinServer,
    leaveServer,
    
    // Channel Actions
    fetchChannel,
    createChannel,
    updateChannel,
    deleteChannel,
    
    // Message Actions
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    
    // SignalR Event Handlers
    handleReceiveMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    handleReactionAdded,
    handleReactionRemoved,
    handleUserOnline,
    handleUserOffline,
    handleUserUpdated,
    handleServerUpdated,
    handleServerDeleted,
    handleUserJoinedServer,
    handleUserLeftServer,
    handleChannelCreated,
    handleChannelUpdated,
    handleChannelDeleted,
    handleRoleCreated,
    handleRoleUpdated,
    handleRoleDeleted,
    handleMemberRolesUpdated,
    handleEmojiCreated,
    handleEmojiDeleted,
    handleUserJoinedVoice,
    handleUserLeftVoice,
    handleAllUsersInChannel,
    handleReceiveOffer,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    handleUserStartedScreenShare,
    handleUserStoppedScreenShare,
    
    // Modal Actions
    openCreateChannelModal,
    closeCreateChannelModal,
  };
});