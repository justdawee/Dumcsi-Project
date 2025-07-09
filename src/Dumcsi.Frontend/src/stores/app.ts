import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { serverService } from '@/services/serverService'
import { channelService } from '@/services/channelService'
import { messageService } from '@/services/messageService'
import { roleService } from '@/services/roleService'
import { emojiService } from '@/services/emojiService'
import { signalRService } from '@/services/signalrService'
import { handleError } from '@/services/errorHandler'
import type {
  ServerListItemDto,
  ServerDetailDto,
  ChannelDetailDto,
  MessageDto,
  CreateMessageRequestDto,
  UpdateMessageRequestDto,
  ServerMemberDto,
  RoleDto,
  EmojiDto,
  CreateServerRequestDto,
  CreateChannelRequestDto,
  EntityId,
  LoadingStates,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
  UserDto
} from '@/types'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<ServerListItemDto[]>([])
  const currentServer = ref<ServerDetailDto | null>(null)
  const currentChannel = ref<ChannelDetailDto | null>(null)
  const messages = ref<MessageDto[]>([])
  const members = ref<ServerMemberDto[]>([])
  const typingUsers = ref<Map<EntityId, Set<EntityId>>>(new Map())
  const onlineUsers = ref<Set<EntityId>>(new Set())
  const voiceChannelUsers = ref<Map<EntityId, Set<EntityId>>>(new Map())

  const loading = ref<LoadingStates>({
    servers: false,
    messages: false,
    members: false,
    channels: false,
    auth: false
  })

  // Getters
  const currentUserId = computed(() => {
    const authStore = useAuthStore()
    return authStore.currentUser?.id || 0
  })

  const sortedMessages = computed(() => {
    return [...messages.value].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  })

  const currentChannelTypingUsers = computed(() => {
    if (!currentChannel.value) return []
    const channelTyping = typingUsers.value.get(currentChannel.value.id)
    if (!channelTyping) return []
    
    return Array.from(channelTyping)
      .filter(userId => userId !== currentUserId.value)
      .map(userId => members.value.find(m => m.userId === userId))
      .filter(Boolean)
  })

  // Server Actions
  const fetchServers = async (): Promise<void> => {
    try {
      loading.value.servers = true
      servers.value = await serverService.getServers()
    } catch (error) {
      throw new Error(handleError(error, 'Failed to load servers'))
    } finally {
      loading.value.servers = false
    }
  }

  const fetchServer = async (serverId: EntityId): Promise<void> => {
    try {
      const server = await serverService.getServer(serverId)
      currentServer.value = server
      await fetchMembers(serverId)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to load server'))
    }
  }

  const createServer = async (data: CreateServerRequestDto): Promise<ServerDetailDto> => {
    try {
      const server = await serverService.createServer(data)
      servers.value.push(server)
      return server
    } catch (error) {
      throw new Error(handleError(error, 'Failed to create server'))
    }
  }

  const joinServer = async (serverId: EntityId): Promise<void> => {
    try {
      await serverService.joinServer(serverId)
      await fetchServers()
    } catch (error) {
      throw new Error(handleError(error, 'Failed to join server'))
    }
  }

  // Channel Actions
  const fetchChannel = async (channelId: EntityId): Promise<void> => {
    try {
      currentChannel.value = await channelService.getChannel(channelId)
      await signalRService.joinChannel(channelId)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to load channel'))
    }
  }

  const createChannel = async (serverId: EntityId, data: CreateChannelRequestDto): Promise<void> => {
    try {
      const channel = await serverService.createChannel(serverId, data)
      if (currentServer.value && currentServer.value.id === serverId) {
        currentServer.value.channels.push(channel)
        currentServer.value.channels.sort((a, b) => a.position - b.position)
      }
    } catch (error) {
      throw new Error(handleError(error, 'Failed to create channel'))
    }
  }

  // Message Actions
  const fetchMessages = async (channelId: EntityId, before?: EntityId): Promise<void> => {
    try {
      loading.value.messages = true
      const newMessages = await messageService.getMessages(channelId, before, 50)
      
      if (before) {
        messages.value.unshift(...newMessages)
      } else {
        messages.value = newMessages
      }
    } catch (error) {
      throw new Error(handleError(error, 'Failed to load messages'))
    } finally {
      loading.value.messages = false
    }
  }

  const fetchMoreMessages = async (channelId: EntityId, beforeMessageId: EntityId): Promise<void> => {
    if (loading.value.messages) return
    await fetchMessages(channelId, beforeMessageId)
  }

  const sendMessage = async (channelId: EntityId, data: CreateMessageRequestDto): Promise<void> => {
    try {
      await messageService.sendMessage(channelId, data)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to send message'))
    }
  }

  const editMessage = async (channelId: EntityId, messageId: EntityId, data: UpdateMessageRequestDto): Promise<void> => {
    try {
      await messageService.updateMessage(channelId, messageId, data)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to edit message'))
    }
  }

  const deleteMessage = async (channelId: EntityId, messageId: EntityId): Promise<void> => {
    try {
      await messageService.deleteMessage(channelId, messageId)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to delete message'))
    }
  }

  // Member Actions
  const fetchMembers = async (serverId: EntityId): Promise<void> => {
    try {
      loading.value.members = true
      members.value = await serverService.getMembers(serverId)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to load members'))
    } finally {
      loading.value.members = false
    }
  }

  // SignalR Event Handlers
  const handleReceiveMessage = (message: MessageDto): void => {
    if (currentChannel.value && message.channelId === currentChannel.value.id) {
      const existingIndex = messages.value.findIndex(m => m.id === message.id)
      if (existingIndex === -1) {
        messages.value.push(message)
      }
    }
  }

  const handleMessageUpdated = (message: MessageDto): void => {
    const index = messages.value.findIndex(m => m.id === message.id)
    if (index !== -1) {
      messages.value[index] = message
    }
  }

  const handleMessageDeleted = (payload: MessageDeletedPayload): void => {
    const index = messages.value.findIndex(m => m.id === payload.messageId)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  const handleUserOnline = (userId: EntityId): void => {
    onlineUsers.value.add(userId)
  }

  const handleUserOffline = (userId: EntityId): void => {
    onlineUsers.value.delete(userId)
  }

  const handleUserTyping = (channelId: EntityId, userId: EntityId): void => {
    if (!typingUsers.value.has(channelId)) {
      typingUsers.value.set(channelId, new Set())
    }
    typingUsers.value.get(channelId)!.add(userId)

    setTimeout(() => {
      handleUserStoppedTyping(channelId, userId)
    }, 5000)
  }

  const handleUserStoppedTyping = (channelId: EntityId, userId: EntityId): void => {
    const channelTyping = typingUsers.value.get(channelId)
    if (channelTyping) {
      channelTyping.delete(userId)
    }
  }

  const handleServerCreated = (server: ServerDetailDto): void => {
    servers.value.push(server)
  }

  const handleServerUpdated = (server: ServerDetailDto): void => {
    const index = servers.value.findIndex(s => s.id === server.id)
    if (index !== -1) {
      servers.value[index] = { ...servers.value[index], ...server }
    }
    if (currentServer.value && currentServer.value.id === server.id) {
      currentServer.value = { ...currentServer.value, ...server }
    }
  }

  const handleServerDeleted = (serverId: EntityId): void => {
    servers.value = servers.value.filter(s => s.id !== serverId)
    if (currentServer.value?.id === serverId) {
      currentServer.value = null
      currentChannel.value = null
      messages.value = []
      members.value = []
    }
  }

  const handleUserJoinedServer = (payload: UserServerPayload): void => {
    if (currentServer.value?.id === payload.serverId) {
      fetchMembers(payload.serverId)
    }
  }

  const handleUserLeftServer = (payload: UserServerPayload): void => {
    if (currentServer.value?.id === payload.serverId) {
      members.value = members.value.filter(m => m.userId !== payload.userId)
    }
  }

  const handleUserKickedFromServer = (payload: UserServerPayload): void => {
    handleUserLeftServer(payload)
    if (payload.userId === currentUserId.value) {
      servers.value = servers.value.filter(s => s.id !== payload.serverId)
      if (currentServer.value?.id === payload.serverId) {
        currentServer.value = null
        currentChannel.value = null
        messages.value = []
        members.value = []
      }
    }
  }

  const handleUserBannedFromServer = (payload: UserServerPayload): void => {
    handleUserKickedFromServer(payload)
  }

  const handleChannelCreated = (channel: ChannelDetailDto): void => {
    if (currentServer.value) {
      currentServer.value.channels.push(channel)
      currentServer.value.channels.sort((a, b) => a.position - b.position)
    }
  }

  const handleChannelUpdated = (channel: ChannelDetailDto): void => {
    if (currentServer.value) {
      const index = currentServer.value.channels.findIndex(c => c.id === channel.id)
      if (index !== -1) {
        currentServer.value.channels[index] = channel
      }
    }
    if (currentChannel.value?.id === channel.id) {
      currentChannel.value = channel
    }
  }

  const handleChannelDeleted = (payload: ChannelDeletedPayload): void => {
    if (currentServer.value) {
      currentServer.value.channels = currentServer.value.channels.filter(c => c.id !== payload.channelId)
    }
    if (currentChannel.value?.id === payload.channelId) {
      currentChannel.value = null
      messages.value = []
    }
  }

  const handleRoleCreated = (role: RoleDto): void => {
    if (currentServer.value) {
      currentServer.value.roles.push(role)
      currentServer.value.roles.sort((a, b) => b.position - a.position)
    }
  }

  const handleRoleUpdated = (role: RoleDto): void => {
    if (currentServer.value) {
      const index = currentServer.value.roles.findIndex(r => r.id === role.id)
      if (index !== -1) {
        currentServer.value.roles[index] = role
      }
    }
  }

  const handleRoleDeleted = (roleId: EntityId): void => {
    if (currentServer.value) {
      currentServer.value.roles = currentServer.value.roles.filter(r => r.id !== roleId)
    }
  }

  const handleMemberRolesUpdated = (payload: { serverId: EntityId; userId: EntityId; roles: RoleDto[] }): void => {
    if (currentServer.value?.id === payload.serverId) {
      const memberIndex = members.value.findIndex(m => m.userId === payload.userId)
      if (memberIndex !== -1) {
        members.value[memberIndex].roles = payload.roles
      }
    }
  }

  const handleEmojiCreated = (emoji: EmojiDto): void => {
    // Handle emoji creation if needed
    console.log('Emoji created:', emoji)
  }

  const handleEmojiDeleted = (payload: { serverId: EntityId; emojiId: EntityId }): void => {
    // Handle emoji deletion if needed
    console.log('Emoji deleted:', payload)
  }

  const handleReactionAdded = (payload: { channelId: EntityId; messageId: EntityId; emojiId: string; userId: EntityId }): void => {
    const message = messages.value.find(m => m.id === payload.messageId)
    if (message) {
      const existingReaction = message.reactions.find(r => r.emojiId === payload.emojiId)
      if (existingReaction) {
        existingReaction.count++
        if (payload.userId === currentUserId.value) {
          existingReaction.me = true
        }
      } else {
        message.reactions.push({
          emojiId: payload.emojiId,
          count: 1,
          me: payload.userId === currentUserId.value
        })
      }
    }
  }

  const handleReactionRemoved = (payload: { channelId: EntityId; messageId: EntityId; emojiId: string; userId: EntityId }): void => {
    const message = messages.value.find(m => m.id === payload.messageId)
    if (message) {
      const reactionIndex = message.reactions.findIndex(r => r.emojiId === payload.emojiId)
      if (reactionIndex !== -1) {
        const reaction = message.reactions[reactionIndex]
        reaction.count--
        if (payload.userId === currentUserId.value) {
          reaction.me = false
        }
        if (reaction.count <= 0) {
          message.reactions.splice(reactionIndex, 1)
        }
      }
    }
  }

  const handleUserUpdated = (user: UserDto): void => {
    // Update user in members list if they're in current server
    const memberIndex = members.value.findIndex(m => m.userId === user.id)
    if (memberIndex !== -1) {
      members.value[memberIndex] = { ...members.value[memberIndex], ...user }
    }
    
    // Update message authors
    messages.value.forEach(message => {
      if (message.author.id === user.id) {
        message.author = { ...message.author, ...user }
      }
    })
  }

  const handleUserJoinedVoice = (payload: { channelId: EntityId; userId: EntityId }): void => {
    if (!voiceChannelUsers.value.has(payload.channelId)) {
      voiceChannelUsers.value.set(payload.channelId, new Set())
    }
    voiceChannelUsers.value.get(payload.channelId)!.add(payload.userId)
  }

  const handleUserLeftVoice = (payload: { channelId: EntityId; userId: EntityId }): void => {
    const channelUsers = voiceChannelUsers.value.get(payload.channelId)
    if (channelUsers) {
      channelUsers.delete(payload.userId)
    }
  }

  const handleAllUsersInChannel = (payload: { channelId: EntityId; userIds: EntityId[] }): void => {
    voiceChannelUsers.value.set(payload.channelId, new Set(payload.userIds))
  }

  const handleUserStartedScreenShare = (payload: { userId: EntityId; channelId: EntityId }): void => {
    // Handle screen share start
    console.log('User started screen share:', payload)
  }

  const handleUserStoppedScreenShare = (payload: { userId: EntityId; channelId: EntityId }): void => {
    // Handle screen share stop
    console.log('User stopped screen share:', payload)
  }

  // Clear state
  const clearCurrentServer = (): void => {
    currentServer.value = null
    currentChannel.value = null
    messages.value = []
    members.value = []
  }

  const clearCurrentChannel = (): void => {
    currentChannel.value = null
    messages.value = []
  }

  return {
    // State
    servers: readonly(servers),
    currentServer: readonly(currentServer),
    currentChannel: readonly(currentChannel),
    messages: readonly(messages),
    members: readonly(members),
    loading: readonly(loading),
    onlineUsers: readonly(onlineUsers),
    
    // Getters
    currentUserId,
    sortedMessages,
    currentChannelTypingUsers,
    
    // Actions
    fetchServers,
    fetchServer,
    createServer,
    joinServer,
    fetchChannel,
    createChannel,
    fetchMessages,
    fetchMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    fetchMembers,
    clearCurrentServer,
    clearCurrentChannel,
    
    // SignalR Event Handlers
    handleReceiveMessage,
    handleMessageUpdated,
    handleMessageDeleted,
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
    handleRoleCreated,
    handleRoleUpdated,
    handleRoleDeleted,
    handleMemberRolesUpdated,
    handleEmojiCreated,
    handleEmojiDeleted,
    handleReactionAdded,
    handleReactionRemoved,
    handleUserUpdated,
    handleUserJoinedVoice,
    handleUserLeftVoice,
    handleAllUsersInChannel,
    handleUserStartedScreenShare,
    handleUserStoppedScreenShare
  }
})