import * as signalR from '@microsoft/signalr';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import type { 
  MessageDto, 
  UserDto, 
  ServerDto, 
  ChannelDto,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
  EntityId 
} from '@/services/types';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null;
  private readonly maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  constructor() {
    // Connection will be created in initialize()
  }

  private createConnection(): void {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL?.replace('/api', '')}/chathub`, {
        accessTokenFactory: () => {
          const token = localStorage.getItem('token');
          // --- ÚJ SOROK A DEBUGOLÁSHOZ ---
          console.log('SignalR accessTokenFactory: Token from localStorage:', token);
          // ------------------------------------
          return token || '';
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount === this.maxReconnectAttempts) {
            return null; // Stop reconnecting
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    const appStore = useAppStore();
    const { addToast } = useToast();

    // Connection lifecycle events
    this.connection.onreconnecting(() => {
      console.log('SignalR: Reconnecting...');
      addToast({
        type: 'warning',
        message: 'Connection lost. Reconnecting...',
        duration: 3000
      });
    });

    this.connection.onreconnected(() => {
      console.log('SignalR: Reconnected');
      this.reconnectAttempts = 0;
      addToast({
        type: 'success',
        message: 'Connection restored',
        duration: 2000
      });
    });

    this.connection.onclose(() => {
      console.log('SignalR: Connection closed');
      this.handleConnectionClosed();
    });

    // Message events
    this.connection.on('ReceiveMessage', (message: MessageDto) => {
      appStore.handleReceiveMessage(message);
    });

    this.connection.on('MessageUpdated', (message: MessageDto) => {
      appStore.handleMessageUpdated(message);
    });

    this.connection.on('MessageDeleted', (payload: MessageDeletedPayload) => {
      appStore.handleMessageDeleted(payload);
    });

    // User events
    this.connection.on('UserUpdated', (user: UserDto) => {
      appStore.handleUserUpdated(user);
    });

    this.connection.on('UserOnline', (userId: EntityId) => {
      appStore.handleUserOnline(userId);
    });

    this.connection.on('UserOffline', (userId: EntityId) => {
      appStore.handleUserOffline(userId);
    });

    this.connection.on('UserTyping', (channelId: EntityId, userId: EntityId) => {
      appStore.handleUserTyping(channelId, userId);
    });

    this.connection.on('UserStoppedTyping', (channelId: EntityId, userId: EntityId) => {
      appStore.handleUserStoppedTyping(channelId, userId);
    });

    // Server events
    this.connection.on('ServerCreated', (server: ServerDto) => {
      appStore.handleServerCreated(server);
    });

    this.connection.on('ServerUpdated', (server: ServerDto) => {
      appStore.handleServerUpdated(server);
    });

    this.connection.on('ServerDeleted', (serverId: EntityId) => {
      appStore.handleServerDeleted(serverId);
    });

    this.connection.on('UserJoinedServer', (payload: UserServerPayload) => {
      appStore.handleUserJoinedServer(payload);
    });

    this.connection.on('UserLeftServer', (payload: UserServerPayload) => {
      appStore.handleUserLeftServer(payload);
    });

    this.connection.on('UserKickedFromServer', (payload: UserServerPayload) => {
      appStore.handleUserKickedFromServer(payload);
      if (payload.userId === appStore.currentUserId) {
        addToast({
          type: 'warning',
          title: 'Kicked from Server',
          message: `You have been kicked from ${payload.serverName || 'the server'}`,
          duration: 5000
        });
      }
    });

    this.connection.on('UserBannedFromServer', (payload: UserServerPayload) => {
      appStore.handleUserBannedFromServer(payload);
      if (payload.userId === appStore.currentUserId) {
        addToast({
          type: 'danger',
          title: 'Banned from Server',
          message: `You have been banned from ${payload.serverName || 'the server'}`,
          duration: 5000
        });
      }
    });

    // Channel events
    this.connection.on('ChannelCreated', (serverId: EntityId, channel: ChannelDto) => {
      appStore.handleChannelCreated(serverId, channel);
    });

    this.connection.on('ChannelUpdated', (channel: ChannelDto) => {
      appStore.handleChannelUpdated(channel);
    });

    this.connection.on('ChannelDeleted', (payload: ChannelDeletedPayload) => {
      appStore.handleChannelDeleted(payload);
    });

    // Voice channel events
    this.connection.on('UserJoinedVoiceChannel', (channelId: EntityId, user: UserDto) => {
      appStore.handleUserJoinedVoiceChannel(channelId, user);
    });

    this.connection.on('UserLeftVoiceChannel', (channelId: EntityId, userId: EntityId) => {
      appStore.handleUserLeftVoiceChannel(channelId, userId);
    });

    this.connection.on('UserStartedScreenShare', (channelId: EntityId, userId: EntityId) => {
      appStore.handleUserStartedScreenShare(channelId, userId);
    });

    this.connection.on('UserStoppedScreenShare', (channelId: EntityId, userId: EntityId) => {
      appStore.handleUserStoppedScreenShare(channelId, userId);
    });
  }

  async initialize(): Promise<void> {
    if (!this.connection) {
      this.createConnection();
      this.setupEventHandlers();
    }

    try {
      await this.connection!.start();
      console.log('SignalR: Connected');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('SignalR: Failed to connect', error);
      this.handleConnectionClosed();
    }
  }

  async stop(): Promise<void> {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error('SignalR: Error stopping connection', error);
      }
    }
  }

  private handleConnectionClosed(): void {
    const authStore = useAuthStore();
    
    if (!authStore.isAuthenticated) {
      return; // Don't try to reconnect if not authenticated
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const { addToast } = useToast();
      addToast({
        type: 'danger',
        title: 'Connection Failed',
        message: 'Unable to establish real-time connection. Please refresh the page.',
        duration: 0 // Persistent
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`SignalR: Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.initialize();
    }, delay);
  }

  // Public methods for sending messages
  async sendTypingIndicator(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('SendTypingIndicator', channelId);
      } catch (error) {
        console.error('Failed to send typing indicator:', error);
      }
    }
  }

  async joinVoiceChannel(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinVoiceChannel', channelId);
      } catch (error) {
        console.error('Failed to join voice channel:', error);
        throw error;
      }
    }
  }

  async leaveVoiceChannel(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveVoiceChannel', channelId);
      } catch (error) {
        console.error('Failed to leave voice channel:', error);
      }
    }
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null;
  }
}

export const signalRService = new SignalRService();