import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { serverService } from '@/services/serverService'
import { channelService } from '@/services/channelService'
import { messageService } from '@/services/messageService'
import { userService } from '@/services/userService'
import signalrService from '@/services/signalrService'
import type { Server, ServerDetails, Channel, Message, User, TypingIndicator, PaginatedResponse } from '@/types'
import { errorMessages } from '@/locales/en'

interface TypingUser extends TypingIndicator {
  timestamp: number
}

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<Server[]>([])
  const currentServer = ref<ServerDetails | null>(null)
  const currentChannel = ref<Channel | null>(null)
  const messages = ref<Map<string, Message[]>>(new Map())
  const typingUsers = ref<Map<string, TypingUser[]>>(new Map())
  const onlineUsers = ref<Set<string>>(new Set())
  const connectionStatus = ref<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('disconnected')
  const activeChannels = ref<Set<string>>(new Set())
  const theme = ref<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'dark')
  
  // UI State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const showServerModal = ref(false)
  const showChannelModal = ref(false)
  const showInviteModal = ref(false)
  const showSettingsModal = ref(false)

  // Getters
  const sortedServers = computed(() => servers.value.slice().sort((a, b) => a.name.localeCompare(b.name)))
  
  const currentChannelMessages = computed(() => {
    if (!currentChannel.value) return []
    return messages.value.get(currentChannel.value.id) || []
  })
  
  const currentChannelTypingUsers = computed(() => {
    if (!currentChannel.value) return []
    const users = typingUsers.value.get(currentChannel.value.id) || []
    // Remove expired typing indicators (older than 3 seconds)
    const now = Date.now()
    return users.filter(u => now - u.timestamp < 3000)
  })

  const isUserOnline = computed(() => (userId: string) => onlineUsers.value.has(userId))

  // Actions
  async function loadServers() {
    isLoading.value = true
    try {
      servers.value = await serverService.getServers()
    } finally {
      isLoading.value = false
    }
  }

  async function selectServer(serverId: string) {
    if (currentServer.value?.id === serverId) return
    
    isLoading.value = true
    try {
      currentServer.value = await serverService.getServer(serverId)
      currentChannel.value = null
      
      // Auto-select first text channel if available
      const firstTextChannel = currentServer.value.channels
        .filter(c => c.type === 'Text')
        .sort((a, b) => a.position - b.position)[0]
      
      if (firstTextChannel) {
        await selectChannel(firstTextChannel.id)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function selectChannel(channelId: string) {
    if (currentChannel.value?.id === channelId) return
    
    try {
      currentChannel.value = await channelService.getChannel(channelId)
      
      // Leave previous channel
      if (activeChannels.value.size > 0) {
        for (const oldChannelId of activeChannels.value) {
          await signalrService.leaveChannel(oldChannelId)
        }
        activeChannels.value.clear()
      }
      
      // Join new channel
      await signalrService.joinChannel(channelId)
      activeChannels.value.add(channelId)
      
      // Load messages
      await loadChannelMessages(channelId)
    } catch (error) {
      console.error('Failed to select channel:', error)
      currentChannel.value = null
    }
  }

  async function sendMessage(content: string, attachmentUrls?: string[]) {
    if (!currentChannel.value) return
    
    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      channelId: currentChannel.value.id,
      authorId: 'current-user',
      author: {} as User, // Will be populated by real response
      content,
      attachmentUrls,
      createdAt: new Date().toISOString(),
      isEdited: false,
      isPinned: false,
      mentions: []
    }
    
    // Optimistically add message
    const channelMessages = messages.value.get(currentChannel.value.id) || []
    messages.value.set(currentChannel.value.id, [...channelMessages, tempMessage])
    
    try {
      const message = await messageService.sendMessage(currentChannel.value.id, { content, attachmentUrls })
      
      // Replace temp message with real one
      const updatedMessages = messages.value.get(currentChannel.value.id) || []
      const index = updatedMessages.findIndex(m => m.id === tempId)
      if (index !== -1) {
        updatedMessages[index] = message
        messages.value.set(currentChannel.value.id, [...updatedMessages])
      }
    } catch (error) {
      // Remove temp message on error
      const updatedMessages = (messages.value.get(currentChannel.value.id) || [])
        .filter(m => m.id !== tempId)
      messages.value.set(currentChannel.value.id, updatedMessages)
      throw error
    }
  }

  // SignalR event handlers
  function handleNewMessage(message: Message) {
    const channelMessages = messages.value.get(message.channelId) || []
    messages.value.set(message.channelId, [...channelMessages, message])
    
    // Update last message timestamp for channel
    if (currentServer.value) {
      const channel = currentServer.value.channels.find(c => c.id === message.channelId)
      if (channel) {
        channel.lastMessageAt = message.createdAt
        if (currentChannel.value?.id !== message.channelId) {
          channel.unreadCount = (channel.unreadCount || 0) + 1
        }
      }
    }
  }

  function handleMessageUpdate(message: Message) {
    const channelMessages = messages.value.get(message.channelId) || []
    const index = channelMessages.findIndex(m => m.id === message.id)
    if (index !== -1) {
      channelMessages[index] = message
      messages.value.set(message.channelId, [...channelMessages])
    }
  }

  function handleMessageDelete(messageId: string, channelId: string) {
    const channelMessages = messages.value.get(channelId) || []
    messages.value.set(channelId, channelMessages.filter(m => m.id !== messageId))
  }

  function updateUserPresence(userId: string, isOnline: boolean, lastSeenAt: string) {
    if (isOnline) {
      onlineUsers.value.add(userId)
    } else {
      onlineUsers.value.delete(userId)
    }
    
    // Update user in server members if present
    if (currentServer.value) {
      const member = currentServer.value.members.find(m => m.userId === userId)
      if (member?.user) {
        member.user.isOnline = isOnline
        member.user.lastSeenAt = lastSeenAt
      }
    }
  }

  function addTypingUser(indicator: TypingIndicator) {
    const channelTyping = typingUsers.value.get(indicator.channelId) || []
    const existing = channelTyping.find(u => u.userId === indicator.userId)
    
    if (existing) {
      existing.timestamp = Date.now()
    } else {
      channelTyping.push({ ...indicator, timestamp: Date.now() })
    }
    
    typingUsers.value.set(indicator.channelId, [...channelTyping])
  }

  function removeTypingUser(userId: string, channelId: string) {
    const channelTyping = typingUsers.value.get(channelId) || []
    typingUsers.value.set(channelId, channelTyping.filter(u => u.userId !== userId))
  }

  function setConnectionStatus(status: typeof connectionStatus.value) {
    connectionStatus.value = status
  }

  function getActiveChannels(): string[] {
    return Array.from(activeChannels.value)
  }

  // Server management
  async function createServer(name: string, description?: string, iconUrl?: string) {
    const server = await serverService.createServer({ name, description, iconUrl })
    servers.value.push(server)
    await selectServer(server.id)
  }

  async function leaveServer(serverId: string) {
    await serverService.leaveServer(serverId)
    servers.value = servers.value.filter(s => s.id !== serverId)
    if (currentServer.value?.id === serverId) {
      currentServer.value = null
      currentChannel.value = null
    }
  }

  async function deleteMessage(messageId: string) {
    if (!currentChannel.value) return
    
    await messageService.deleteMessage(messageId)
    const channelMessages = messages.value.get(currentChannel.value.id) || []
    messages.value.set(currentChannel.value.id, channelMessages.filter(m => m.id !== messageId))
  }

  async function refreshServer(serverId: string) {
    if (currentServer.value?.id === serverId) {
      currentServer.value = await serverService.getServer(serverId)
    }
  }

  function handleServerDeleted(serverId: string) {
    servers.value = servers.value.filter(s => s.id !== serverId)
    if (currentServer.value?.id === serverId) {
      currentServer.value = null
      currentChannel.value = null
    }
  }

  async function refreshChannels(serverId: string) {
    if (currentServer.value?.id === serverId) {
      currentServer.value.channels = await channelService.getChannels(serverId)
    }
  }

  async function refreshChannel(channelId: string) {
    const channel = await channelService.getChannel(channelId)
    if (currentServer.value) {
      const index = currentServer.value.channels.findIndex(c => c.id === channelId)
      if (index !== -1) {
        currentServer.value.channels[index] = channel
      }
    }
    if (currentChannel.value?.id === channelId) {
      currentChannel.value = channel
    }
  }

  function handleChannelDeleted(serverId: string, channelId: string) {
    if (currentServer.value?.id === serverId) {
      currentServer.value.channels = currentServer.value.channels.filter(c => c.id !== channelId)
    }
    if (currentChannel.value?.id === channelId) {
      currentChannel.value = null
      messages.value.delete(channelId)
      typingUsers.value.delete(channelId)
      activeChannels.value.delete(channelId)
    }
  }

  function handleUserJoinedServer(serverId: string, userId: string) {
    if (currentServer.value?.id === serverId) {
      refreshServer(serverId)
    }
  }

  function handleUserLeftServer(serverId: string, userId: string) {
    if (currentServer.value?.id === serverId) {
      currentServer.value.members = currentServer.value.members.filter(m => m.userId !== userId)
    }
  }

  // Utility functions
  function showError(message: string) {
    error.value = message
    setTimeout(() => error.value = null, 5000)
  }

  function getErrorMessage(code: string): string {
    return errorMessages[code] || 'An unexpected error occurred'
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', theme.value)
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  // Initialize theme
  document.documentElement.setAttribute('data-theme', theme.value)

  return {
    // State
    servers,
    currentServer,
    currentChannel,
    messages,
    typingUsers,
    onlineUsers,
    connectionStatus,
    theme,
    isLoading,
    error,
    showServerModal,
    showChannelModal,
    showInviteModal,
    showSettingsModal,
    
    // Getters
    sortedServers,
    currentChannelMessages,
    currentChannelTypingUsers,
    isUserOnline,
    
    // Actions
    loadServers,
    selectServer,
    selectChannel,
    sendMessage,
    createServer,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    updateUserPresence,
    addTypingUser,
    removeTypingUser,
    setConnectionStatus,
    getActiveChannels,
    refreshServer,
    handleServerDeleted,
    refreshChannels,
    refreshChannel,
    handleChannelDeleted,
    handleUserJoinedServer,
    handleUserLeftServer,
    showError,
    getErrorMessage,
    toggleTheme
  }
})