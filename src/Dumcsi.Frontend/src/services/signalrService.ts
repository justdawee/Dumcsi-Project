import * as signalR from "@microsoft/signalr";
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import type { 
  MessageDto, 
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

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  async initialize() {
    const authStore = useAuthStore();
    if (!authStore.token || this.isConnecting || this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.isConnecting = true;

    try {
      // Build the SignalR connection
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl("/chathub", {
          accessTokenFactory: () => authStore.token || "",
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 5000;
            return 10000;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup connection lifecycle handlers
      this.setupConnectionHandlers();
      
      // Setup event handlers
      this.setupEventHandlers();

      // Start the connection
      await this.start();
    } catch (error) {
      console.error("Failed to initialize SignalR:", error);
      this.isConnecting = false;
    }
  }

  private setupConnectionHandlers() {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      console.log("SignalR Reconnecting:", error);
      const { addToast } = useToast();
      addToast({
        type: 'warning',
        message: 'Connection lost. Attempting to reconnect...',
        duration: 5000
      });
    });

    this.connection.onreconnected((connectionId) => {
      console.log("SignalR Reconnected:", connectionId);
      this.reconnectAttempts = 0;
      const { addToast } = useToast();
      addToast({
        type: 'success',
        message: 'Connection restored',
        duration: 3000
      });
    });

    this.connection.onclose((error) => {
      console.log("SignalR Connection closed:", error);
      this.isConnecting = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        const { addToast } = useToast();
        addToast({
          type: 'danger',
          message: 'Unable to establish connection. Please refresh the page.',
          duration: 0 // Don't auto-hide
        });
      }
    });
  }

  private setupEventHandlers() {
    if (!this.connection) return;
    const appStore = useAppStore();

    // Message Events
    this.connection.on("ReceiveMessage", (message: MessageDto) => {
      appStore.handleReceiveMessage(message);
    });

    this.connection.on("MessageUpdated", (message: MessageDto) => {
      appStore.handleMessageUpdated(message);
    });

    this.connection.on("MessageDeleted", (payload: MessageDeletedPayload) => {
      appStore.handleMessageDeleted(payload);
    });

    // Reaction Events
    this.connection.on("ReactionAdded", (payload: ReactionPayload) => {
      appStore.handleReactionAdded(payload);
    });

    this.connection.on("ReactionRemoved", (payload: ReactionPayload) => {
      appStore.handleReactionRemoved(payload);
    });

    // User Events
    this.connection.on("UserIsOnline", (userId: number) => {
      appStore.handleUserOnline(userId);
    });

    this.connection.on("UserIsOffline", (userId: number) => {
      appStore.handleUserOffline(userId);
    });

    this.connection.on("UserUpdated", (user: UserDto) => {
      appStore.handleUserUpdated(user);
    });

    // Server Events
    this.connection.on("ServerUpdated", (server: ServerDto) => {
      appStore.handleServerUpdated(server);
    });

    this.connection.on("ServerDeleted", (serverId: number) => {
      appStore.handleServerDeleted(serverId);
    });

    this.connection.on("UserJoinedServer", (payload: UserServerPayload) => {
      appStore.handleUserJoinedServer(payload);
    });

    this.connection.on("UserLeftServer", (payload: UserServerPayload) => {
      appStore.handleUserLeftServer(payload);
    });

    // Channel Events
    this.connection.on("ChannelCreated", (channel: ChannelDto) => {
      appStore.handleChannelCreated(channel);
    });

    this.connection.on("ChannelUpdated", (channel: ChannelDto) => {
      appStore.handleChannelUpdated(channel);
    });

    this.connection.on("ChannelDeleted", (payload: ChannelDeletedPayload) => {
      appStore.handleChannelDeleted(payload);
    });

    // Role Events
    this.connection.on("RoleCreated", (role: RoleDto) => {
      appStore.handleRoleCreated(role);
    });

    this.connection.on("RoleUpdated", (role: RoleDto) => {
      appStore.handleRoleUpdated(role);
    });

    this.connection.on("RoleDeleted", (roleId: number) => {
      appStore.handleRoleDeleted(roleId);
    });

    this.connection.on("MemberRolesUpdated", (payload: MemberRolesUpdatedPayload) => {
      appStore.handleMemberRolesUpdated(payload);
    });

    // Emoji Events
    this.connection.on("EmojiCreated", (emoji: EmojiDto) => {
      appStore.handleEmojiCreated(emoji);
    });

    this.connection.on("EmojiDeleted", (payload: EmojiDeletedPayload) => {
      appStore.handleEmojiDeleted(payload);
    });

    // Voice/Video Events
    this.connection.on("UserJoinedVoice", (payload: VoiceChannelPayload) => {
      appStore.handleUserJoinedVoice(payload);
    });

    this.connection.on("UserLeftVoice", (payload: VoiceChannelPayload) => {
      appStore.handleUserLeftVoice(payload);
    });

    this.connection.on("AllUsersInChannel", (users: UserDto[]) => {
      appStore.handleAllUsersInChannel(users);
    });

    // WebRTC Signaling
    this.connection.on("ReceiveOffer", (payload: WebRTCSignalPayload) => {
      appStore.handleReceiveOffer(payload);
    });

    this.connection.on("ReceiveAnswer", (payload: WebRTCSignalPayload) => {
      appStore.handleReceiveAnswer(payload);
    });

    this.connection.on("ReceiveIceCandidate", (payload: WebRTCSignalPayload) => {
      appStore.handleReceiveIceCandidate(payload);
    });

    // Screen Share Events
    this.connection.on("UserStartedScreenShare", (payload: ScreenSharePayload) => {
      appStore.handleUserStartedScreenShare(payload);
    });

    this.connection.on("UserStoppedScreenShare", (payload: ScreenSharePayload) => {
      appStore.handleUserStoppedScreenShare(payload);
    });
  }

  private async start() {
    if (!this.connection) return;

    try {
      await this.connection.start();
      console.log("SignalR Connected");
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      const { addToast } = useToast();
      addToast({
        type: 'success',
        message: 'Real-time connection established',
        duration: 3000
      });
    } catch (err) {
      console.error("SignalR Connection Error:", err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectAttempts++;

    this.reconnectInterval = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.initialize();
    }, delay);
  }

  async stop() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Public methods for sending messages via SignalR
  async sendMessage(channelId: number, content: string, mentionedUserIds?: number[], mentionedRoleIds?: number[]) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server");
    }
    
    await this.connection.invoke("SendMessage", channelId, content, mentionedUserIds, mentionedRoleIds);
  }

  async joinVoiceChannel(channelId: number) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server");
    }
    
    await this.connection.invoke("JoinVoiceChannel", channelId);
  }

  async leaveVoiceChannel(channelId: number) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server");
    }
    
    await this.connection.invoke("LeaveVoiceChannel", channelId);
  }

  async startScreenShare(channelId: number) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server");
    }
    
    await this.connection.invoke("StartScreenShare", channelId);
  }

  async stopScreenShare(channelId: number) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server");
    }
    
    await this.connection.invoke("StopScreenShare", channelId);
  }

  async sendWebRTCSignal(toUserId: number, signal: any) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server");
    }
    
    await this.connection.invoke("SendSignal", toUserId, signal);
  }

  // Typing indicators
  async startTyping(channelId: number) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    
    await this.connection.invoke("StartTyping", channelId);
  }

  async stopTyping(channelId: number) {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    
    await this.connection.invoke("StopTyping", channelId);
  }

  // Connection state getters
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null;
  }
}

// Export singleton instance
export const signalRService = new SignalRService();

// Export class for testing purposes
export { SignalRService };