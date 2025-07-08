import * as signalR from '@microsoft/signalr';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { registerSignalREventHandlers } from './signalrHandlers';
import type { EntityId } from '@/services/types';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null;
  private readonly maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  constructor() {
    // A kapcsolat az initialize() metódusban jön létre
  }

  private createConnection(): void {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL?.replace('/api', '')}/chathub`, {
        accessTokenFactory: () => {
          const token = localStorage.getItem('token');
          return token || '';
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null; // Újracsatlakozás leállítása
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

    // Kapcsolat életciklus eseményei
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
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.handleConnectionClosed();
      }
    });

    registerSignalREventHandlers(this.connection, appStore);
  }

  async initialize(): Promise<void> {
    if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
        return;
    }
    
    if (!this.connection) {
      this.createConnection();
      this.setupEventHandlers();
    }
    
    this.reconnectAttempts = 0;

    try {
      await this.connection!.start();
      console.log('SignalR: Connected');
    } catch (error) {
      console.error('SignalR: Failed to connect initially', error);
      this.reconnectAttempts = this.maxReconnectAttempts; // Megakadályozzuk a további próbálkozást
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
        console.log('SignalR: Connection stopped successfully.');
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
