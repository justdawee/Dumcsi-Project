import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { Message, TypingIndicator, UserPresence } from '@/types'

class SignalRService {
  private connection: HubConnection | null = null
  private reconnectInterval: number | null = null

  async initialize(): Promise<void> {
    const authStore = useAuthStore()
    
    if (!authStore.token) {
      throw new Error('No authentication token available')
    }

    this.connection = new HubConnectionBuilder()
      .withUrl('/chathub', {
        accessTokenFactory: () => authStore.token || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()

    this.setupEventHandlers()
    
    try {
      await this.connection.start()
      console.log('SignalR connected')
    } catch (error) {
      console.error('SignalR connection failed:', error)
      this.scheduleReconnect()
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return

    const appStore = useAppStore()

    // Message events
    this.connection.on('ReceiveMessage', (message: Message) => {
      appStore.handleNewMessage(message)
    })

    this.connection.on('MessageUpdated', (message: Message) => {
      appStore.handleMessageUpdate(message)
    })

    this.connection.on('MessageDeleted', (messageId: string, channelId: string) => {
      appStore.handleMessageDelete(messageId, channelId)
    })

    // User presence events
    this.connection.on('UserIsOnline', (presence: UserPresence) => {
      appStore.updateUserPresence(presence.userId, true, presence.lastSeenAt)
    })

    this.connection.on('UserIsOffline', (presence: UserPresence) => {
      appStore.updateUserPresence(presence.userId, false, presence.lastSeenAt)
    })

    // Typing indicators
    this.connection.on('UserTyping', (indicator: TypingIndicator) => {
      appStore.addTypingUser(indicator)
    })

    this.connection.on('UserStoppedTyping', (indicator: TypingIndicator) => {
      appStore.removeTypingUser(indicator.userId, indicator.channelId)
    })

    // Server events
    this.connection.on('ServerUpdated', (serverId: string) => {
      appStore.refreshServer(serverId)
    })

    this.connection.on('ServerDeleted', (serverId: string) => {
      appStore.handleServerDeleted(serverId)
    })

    this.connection.on('UserJoinedServer', (serverId: string, userId: string) => {
      appStore.handleUserJoinedServer(serverId, userId)
    })

    this.connection.on('UserLeftServer', (serverId: string, userId: string) => {
      appStore.handleUserLeftServer(serverId, userId)
    })

    // Channel events
    this.connection.on('ChannelCreated', (serverId: string, channelId: string) => {
      appStore.refreshChannels(serverId)
    })

    this.connection.on('ChannelUpdated', (channelId: string) => {
      appStore.refreshChannel(channelId)
    })

    this.connection.on('ChannelDeleted', (serverId: string, channelId: string) => {
      appStore.handleChannelDeleted(serverId, channelId)
    })

    // Connection lifecycle
    this.connection.onreconnecting(() => {
      appStore.setConnectionStatus('reconnecting')
    })

    this.connection.onreconnected(() => {
      appStore.setConnectionStatus('connected')
      this.rejoinChannels()
    })

    this.connection.onclose(() => {
      appStore.setConnectionStatus('disconnected')
      this.scheduleReconnect()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) return

    this.reconnectInterval = window.setInterval(async () => {
      try {
        await this.initialize()
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval)
          this.reconnectInterval = null
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error)
      }
    }, 30000)
  }

  private async rejoinChannels(): Promise<void> {
    const appStore = useAppStore()
    const activeChannels = appStore.getActiveChannels()
    
    for (const channelId of activeChannels) {
      await this.joinChannel(channelId)
    }
  }

  async joinChannel(channelId: string): Promise<void> {
    if (!this.connection) throw new Error('SignalR not connected')
    await this.connection.invoke('JoinChannel', channelId)
  }

  async leaveChannel(channelId: string): Promise<void> {
    if (!this.connection) throw new Error('SignalR not connected')
    await this.connection.invoke('LeaveChannel', channelId)
  }

  async sendTypingIndicator(channelId: string): Promise<void> {
    if (!this.connection) throw new Error('SignalR not connected')
    await this.connection.invoke('SendTypingIndicator', channelId)
  }

  async stop(): Promise<void> {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }
    
    if (this.connection) {
      await this.connection.stop()
      this.connection = null
    }
  }

  isConnected(): boolean {
    return this.connection?.state === 'Connected'
  }
}

export default new SignalRService()