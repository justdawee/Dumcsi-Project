import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import serverService from '@/services/serverService'
import messageService from '@/services/messageService'

interface Channel {
  id: string;
  name: string;
}

interface Server {
  id: string;
  name: string;
  channels: Channel[];
}

interface Message {
  id: string;
  content: string;
  author: any;
}

interface Member {
  id: string;
  name: string;
}

export const useAppStore = defineStore('app', () => {
  // State
  const servers = ref<Server[]>([])
  const currentServer = ref<Server | null>(null)
  const currentChannel = ref<Channel | null>(null)
  const messages = ref<Message[]>([])
  const members = ref<Member[]>([])
  const loading = ref({
    servers: false,
    server: false,
    channel: false,
    messages: false,
    members: false
  })
  const error = ref(null)

  // Getters
  const currentServerChannels = computed(() => 
    currentServer.value?.channels || []
  )

  // Actions
  const fetchServers = async () => {
    loading.value.servers = true
    try {
      const response = await serverService.getServers()
      servers.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch servers'
    } finally {
      loading.value.servers = false
    }
  }

  const fetchServer = async (serverId: string): Promise<Server> => {
    loading.value.server = true
    try {
      const response = await serverService.getServer(serverId)
      currentServer.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch server'
      throw err
    } finally {
      loading.value.server = false
    }
  }

  const fetchChannel = async (channelId: string): Promise<Channel> => {
    loading.value.channel = true
    try {
      const response = await serverService.getChannel(channelId)
      currentChannel.value = response.data
      // Auto-fetch messages when channel is loaded
      await fetchMessages(channelId)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch channel'
      throw err
    } finally {
      loading.value.channel = false
    }
  }

  const fetchMessages = async (channelId: string, before: string | null = null): Promise<void> => {
    loading.value.messages = true
    try {
      const params = before ? { before, limit: 50 } : { limit: 50 }
      const response = await messageService.getMessages(channelId, params)
      if (before) {
        messages.value = [...response.data, ...messages.value]
      } else {
        messages.value = response.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch messages'
    } finally {
      loading.value.messages = false
    }
  }

  interface SendMessagePayload {
    content: string;
  }

  const sendMessage = async (channelId: string, content: SendMessagePayload): Promise<Message> => {
    try {
      const response = await messageService.sendMessage(channelId, content)
      messages.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to send message'
      throw err
    }
  }

  interface CreateServerPayload {
    name: string;
  }

  const createServer = async (serverData: CreateServerPayload): Promise<Server> => {
    try {
      const response = await serverService.createServer(serverData)
      await fetchServers() // Refresh server list
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create server'
      throw err
    }
  }

  interface CreateChannelPayload {
    name: string;
  }

  const createChannel = async (serverId: string, channelData: CreateChannelPayload): Promise<Channel> => {
    try {
      const response = await serverService.createChannel(serverId, channelData)
      await fetchServer(serverId) // Refresh server data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create channel'
      throw err
    }
  }

  interface JoinServerPayload {
    inviteCode: string;
  }

  const joinServer = async (serverId: string, payload: JoinServerPayload): Promise<Server> => {
    try {
      const response = await serverService.joinServer(serverId, payload)
      await fetchServers() // Refresh server list
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to join server'
      throw err
    }
  }

  const leaveServer = async (serverId: string): Promise<void> => {
    try {
      await serverService.leaveServer(serverId)
      await fetchServers() // Refresh server list
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to leave server'
      throw err
    }
  }

  const reset = () => {
    servers.value = []
    currentServer.value = null
    currentChannel.value = null
    messages.value = []
    members.value = []
    error.value = null
  }

  return {
    // State
    servers,
    currentServer,
    currentChannel,
    messages,
    members,
    loading,
    error,
    // Getters
    currentServerChannels,
    // Actions
    fetchServers,
    fetchServer,
    fetchChannel,
    fetchMessages,
    sendMessage,
    createServer,
    createChannel,
    joinServer,
    leaveServer,
    reset
  }
})