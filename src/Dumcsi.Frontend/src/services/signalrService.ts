import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import type {
  MessageDto,
  UserProfileDto,
  EntityId,
  MessageDeletedPayload,
  ChannelDeletedPayload,
  UserServerPayload,
  ServerListItemDto,
  ReactionPayload, ChannelDetailDto
} from './types';

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  async initialize(): Promise<void> {
    const authStore = useAuthStore();

    if (!authStore.token) {
      console.error('SignalR: No auth token available');
      return;
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR: Already connected');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5230/api'
      const hubBase = apiUrl.replace(/\/api$/, '')
      this.connection = new signalR.HubConnectionBuilder()
          .withUrl(`${hubBase}/chathub`, {
            accessTokenFactory: () => authStore.token || ''
          })
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (retryContext) => {
              if (retryContext.previousRetryCount === this.maxReconnectAttempts) {
                return null;
              }
              return Math.min(this.reconnectDelay * Math.pow(2, retryContext.previousRetryCount), 30000);
            }
          })
          .configureLogging(signalR.LogLevel.Information)
          .build();

      this.setupEventHandlers();

      await this.connection.start();
      console.log('SignalR: Connected successfully');

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('SignalR: Failed to start connection', error);
      this.handleConnectionClosed();
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    const appStore = useAppStore();

    // Message events
    this.connection.on('ReceiveMessage', (message: MessageDto) => {
      console.log('SignalR: Received message', message);
      appStore.handleReceiveMessage(message);
    });

    this.connection.on('MessageUpdated', (message: MessageDto) => {
      console.log('SignalR: Message updated', message);
      appStore.handleMessageUpdated(message);
    });

    this.connection.on('MessageDeleted', (payload: MessageDeletedPayload) => {
      console.log('SignalR: Message deleted', payload);
      appStore.handleMessageDeleted(payload);
    });

    this.connection.on('ReactionAdded', (payload: ReactionPayload) => {
      console.log('SignalR: Reaction added', payload);
      appStore.handleReactionAdded(payload);
    });

    this.connection.on('ReactionRemoved', (payload: ReactionPayload) => {
      console.log('SignalR: Reaction removed', payload);
      appStore.handleReactionRemoved(payload);
    });

    // Channel events
    this.connection.on('ChannelCreated', (channel: ChannelDetailDto) => {
      console.log('SignalR: Channel created', channel);
      appStore.handleChannelCreated(channel);
    });

    this.connection.on('ChannelUpdated', (channel: ChannelDetailDto) => {
      console.log('SignalR: Channel updated', channel);
      appStore.handleChannelUpdated(channel);
    });

    this.connection.on('ChannelDeleted', (payload: ChannelDeletedPayload) => {
      console.log('SignalR: Channel deleted', payload);
      appStore.handleChannelDeleted(payload);
    });

    // User events
    this.connection.on('UserUpdated', (user: UserProfileDto) => {
      console.log('SignalR: User updated', user);
      appStore.handleUserUpdated(user);
    });

    this.connection.on('UserOnline', (userId: EntityId) => {
      console.log('SignalR: User online', userId);
      appStore.handleUserOnline(userId);
    });

    this.connection.on('UserOffline', (userId: EntityId) => {
      console.log('SignalR: User offline', userId);
      appStore.handleUserOffline(userId);
    });

    // Typing indicator
    this.connection.on('UserTyping', (channelId: EntityId, userId: EntityId) => {
      console.log('SignalR: User typing', { channelId, userId });
      appStore.handleUserTyping(channelId, userId);
    });

    this.connection.on('UserStoppedTyping', (channelId: EntityId, userId: EntityId) => {
      console.log('SignalR: User stopped typing', { channelId, userId });
      appStore.handleUserStoppedTyping(channelId, userId);
    });

    // Voice channel events
    this.connection.on('UserJoinedVoiceChannel', (channelId: EntityId, user: UserProfileDto) => {
      console.log('SignalR: User joined voice channel', { channelId, user });
      appStore.handleUserJoinedVoiceChannel(channelId, user);
    });

    this.connection.on('UserLeftVoiceChannel', (channelId: EntityId, userId: EntityId) => {
      console.log('SignalR: User left voice channel', { channelId, userId });
      appStore.handleUserLeftVoiceChannel(channelId, userId);
    });

    this.connection.on('UserStartedScreenShare', (channelId: EntityId, userId: EntityId) => {
      console.log('SignalR: User started screen share', { channelId, userId });
      appStore.handleUserStartedScreenShare(channelId, userId);
    });

    this.connection.on('UserStoppedScreenShare', (channelId: EntityId, userId: EntityId) => {
      console.log('SignalR: User stopped screen share', { channelId, userId });
      appStore.handleUserStoppedScreenShare(channelId, userId);
    });

    // Server events
    this.connection.on('ServerCreated', (server: ServerListItemDto) => {
      console.log('SignalR: Server created', server);
      appStore.handleServerCreated(server);
    });

    this.connection.on('ServerUpdated', (server: ServerListItemDto) => {
      console.log('SignalR: Server updated', server);
      appStore.handleServerUpdated(server);
    });

    this.connection.on('ServerDeleted', (serverId: EntityId) => {
      console.log('SignalR: Server deleted', serverId);
      appStore.handleServerDeleted(serverId);
    });

    this.connection.on('UserJoinedServer', (payload: UserServerPayload) => {
      console.log('SignalR: User joined server', payload);
      appStore.handleUserJoinedServer(payload);
    });

    this.connection.on('UserLeftServer', (payload: UserServerPayload) => {
      console.log('SignalR: User left server', payload);
      appStore.handleUserLeftServer(payload);
    });

    this.connection.on('UserKickedFromServer', (payload: UserServerPayload) => {
      console.log('SignalR: User kicked from server', payload);
      appStore.handleUserKickedFromServer(payload);
    });

    this.connection.on('UserBannedFromServer', (payload: UserServerPayload) => {
      console.log('SignalR: User banned from server', payload);
      appStore.handleUserBannedFromServer(payload);
    });

    // Connection events
    this.connection.onclose((error) => {
      console.log('SignalR: Connection closed', error);
      this.handleConnectionClosed();
    });

    this.connection.onreconnecting((error) => {
      console.log('SignalR: Reconnecting...', error);
      const { addToast } = useToast();
      addToast({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Attempting to reconnect...',
        duration: 5000
      });
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR: Reconnected', connectionId);
      const { addToast } = useToast();
      addToast({
        type: 'success',
        title: 'Connected',
        message: 'Connection restored.',
        duration: 3000
      });
    });
  }

  async stop(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('SignalR: Connection stopped');
      } catch (error) {
        console.error('SignalR: Error stopping connection', error);
      }
    }
  }

  private handleConnectionClosed(): void {
    const authStore = useAuthStore();

    if (!authStore.isAuthenticated) {
      return;
    }

    const { addToast } = useToast();

    addToast({
      type: 'danger',
      title: 'Connection Failed',
      message: 'Unable to establish real-time connection. Please refresh the page.',
      duration: 0 // Nem tűnik el automatikusan
    });
  }

  // Nyilvános metódusok üzenetek küldéséhez
  async sendTypingIndicator(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('SendTypingIndicator', channelId.toString());
      } catch (error) {
        console.error('Failed to send typing indicator:', error);
      }
    }
  }

  async joinChannel(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinChannel', channelId.toString());
      } catch (error) {
        console.error('Failed to join channel:', error);
      }
    }
  }

  async leaveChannel(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveChannel', channelId.toString());
      } catch (error) {
        console.error('Failed to leave channel:', error);
      }
    }
  }

  async joinVoiceChannel(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinVoiceChannel', channelId.toString());
      } catch (error) {
        console.error('Failed to join voice channel:', error);
        throw error;
      }
    }
  }

  async leaveVoiceChannel(channelId: EntityId): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveVoiceChannel', channelId.toString());
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