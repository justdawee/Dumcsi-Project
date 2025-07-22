import * as signalR from '@microsoft/signalr';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import type {
    MessageDto,
    UserProfileDto,
    EntityId,
    MessageDeletedPayload,
    ChannelDeletedPayload,
    UserServerPayload,
    ServerListItemDto,
    ReactionPayload,
    ChannelDetailDto,
} from '@/services/types';

import {UserStatus} from '@/services/types'

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

        // Connection lifecycle events
        this.connection.onreconnecting(() => {
            console.log('SignalR: Reconnecting...');
            appStore.setConnectionState('reconnecting');
        });

        this.connection.onreconnected(() => {
            console.log('SignalR: Reconnected');
            appStore.setConnectionState('connected');

            // Re-join current server and channel after reconnection
            const currentServerId = appStore.currentServer?.id;
            const currentChannelId = appStore.currentChannel?.id;

            if (currentServerId) {
                this.joinServer(currentServerId);
            }

            if (currentChannelId) {
                this.joinChannel(currentChannelId);
            }
        });

        this.connection.onclose(() => {
            console.log('SignalR: Connection closed');
            appStore.setConnectionState('disconnected');
        });

        this.connection.on('Connected', (onlineUserIds: EntityId[]) => {
            console.log('SignalR: Received online users on connect', onlineUserIds);

            // Set all online users
            appStore.onlineUsers = new Set(onlineUserIds);

            // Update member objects if we have them
            appStore.members.forEach(member => {
                member.isOnline = appStore.onlineUsers.has(member.userId);
                member.status = member.isOnline ? UserStatus.Online : UserStatus.Offline;
            });

            // Set own status to online
            const authStore = useAuthStore();
            if (authStore.user?.id) {
                appStore.onlineUsers.add(authStore.user.id);
                const selfMember = appStore.members.find(m => m.userId === authStore.user?.id);
                if (selfMember) {
                    selfMember.isOnline = true;
                    selfMember.status = UserStatus.Online;
                }
            }
        });

        // Typing indicator
        this.connection.on('UserTyping', (channelId: EntityId, userId: EntityId) => {
            console.log('SignalR: User typing', {channelId, userId});
            appStore.handleUserTyping(channelId, userId);
        });

        this.connection.on('UserStoppedTyping', (channelId: EntityId, userId: EntityId) => {
            console.log('SignalR: User stopped typing', {channelId, userId});
            appStore.handleUserStoppedTyping(channelId, userId);
        });

        // Voice channel events
        this.connection.on('UserJoinedVoiceChannel', (channelId: EntityId, user: UserProfileDto) => {
            console.log('SignalR: User joined voice channel', {channelId, user});
            appStore.handleUserJoinedVoiceChannel(channelId, user);
        });

        this.connection.on('UserLeftVoiceChannel', (channelId: EntityId, userId: EntityId) => {
            console.log('SignalR: User left voice channel', {channelId, userId});
            appStore.handleUserLeftVoiceChannel(channelId, userId);
        });

        this.connection.on('UserStartedScreenShare', (channelId: EntityId, userId: EntityId) => {
            console.log('SignalR: User started screen share', {channelId, userId});
            appStore.handleUserStartedScreenShare(channelId, userId);
        });

        this.connection.on('UserStoppedScreenShare', (channelId: EntityId, userId: EntityId) => {
            console.log('SignalR: User stopped screen share', {channelId, userId});
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

        // Role events
        this.connection.on('RoleCreated', (role: any) => {
            console.log('SignalR: Role created', role);
            appStore.handleRoleCreated(role);
        });

        this.connection.on('RoleUpdated', (role: any) => {
            console.log('SignalR: Role updated', role);
            appStore.handleRoleUpdated(role);
        });

        this.connection.on('RoleDeleted', (roleId: EntityId) => {
            console.log('SignalR: Role deleted', roleId);
            appStore.handleRoleDeleted(roleId);
        });

        this.connection.on('MemberRolesUpdated', (payload: any) => {
            console.log('SignalR: Member roles updated', payload);
            appStore.handleMemberRolesUpdated(payload);
        });

        // Connection events
        this.connection.onclose((error) => {
            console.log('SignalR: Connection closed', error);
            this.handleConnectionClosed();
        });

        this.connection.onreconnecting((error) => {
            console.log('SignalR: Reconnecting...', error);
            const {addToast} = useToast();
            addToast({
                type: 'warning',
                title: 'Connection Lost',
                message: 'Attempting to reconnect...',
                duration: 5000
            });
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR: Reconnected', connectionId);
            const {addToast} = useToast();
            addToast({
                type: 'success',
                title: 'Connected',
                message: 'Connection restored.',
                duration: 3000
            });
        });
    }

    async start(): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            console.log('SignalR already connected');
            return;
        }

        const authStore = useAuthStore();
        const appStore = useAppStore();

        if (!authStore.token) {
            console.error('No auth token available');
            return;
        }

        try {
            // Set connecting state
            appStore.setConnectionState('connecting');

            await this.initialize();
            console.log('SignalR connection started');

            // Set connected state
            appStore.setConnectionState('connected');

            // Add self to online users immediately
            if (authStore.user?.id) {
                appStore.onlineUsers.add(authStore.user.id);
            }

            // Re-join current server/channel if any
            if (appStore.currentServer?.id) {
                await this.joinServer(appStore.currentServer.id);
            }

            if (appStore.currentChannel?.id) {
                await this.joinChannel(appStore.currentChannel.id);
            }
        } catch (error) {
            console.error('Failed to start SignalR connection:', error);
            appStore.setConnectionState('disconnected');
            this.handleConnectionClosed();
        }
    }

    async stop(): Promise<void> {
        if (this.connection) {
            const appStore = useAppStore();
            appStore.setConnectionState('disconnected');

            try {
                await this.connection.stop();
                console.log('SignalR connection stopped');
            } catch (error) {
                console.error('Error stopping SignalR connection:', error);
            }
        }
    }

    private handleConnectionClosed(): void {
        const authStore = useAuthStore();

        if (!authStore.isAuthenticated) {
            return;
        }

        const {addToast} = useToast();

        addToast({
            type: 'danger',
            title: 'Connection Failed',
            message: 'Unable to establish real-time connection. Please refresh the page.',
            duration: 0 // Nem tűnik el automatikusan
        });
    }

    async sendTypingIndicator(channelId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            const authStore = useAuthStore();
            try {
                await this.connection.invoke('SendTypingIndicator', channelId.toString());
                if (authStore.user?.id) {
                    const appStore = useAppStore();
                    appStore.handleUserTyping(channelId, authStore.user.id);
                }
            } catch (error) {
                console.error('Failed to send typing indicator:', error);
            }
        }
    }

    async stopTypingIndicator(channelId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            const authStore = useAuthStore();
            try {
                await this.connection.invoke('StopTypingIndicator', channelId.toString());
                if (authStore.user?.id) {
                    const appStore = useAppStore();
                    appStore.handleUserStoppedTyping(channelId, authStore.user.id);
                }
            } catch (error) {
                console.error('Failed to send stop typing indicator:', error);
            }
        }
    }

    async joinServer(serverId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('JoinServer', serverId.toString());
            } catch (error) {
                console.error('Failed to join server:', error);
            }
        }
    }

    async leaveServer(serverId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('LeaveServer', serverId.toString());
            } catch (error) {
                console.error('Failed to leave server:', error);
            }
        }
    }

    async joinChannel(channelId: EntityId): Promise<EntityId[]> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                const result = await this.connection.invoke<{
                    typingUserIds: EntityId[],
                    onlineUserIds: EntityId[]
                }>('JoinChannel', channelId.toString());

                if (result) {
                    const appStore = useAppStore();

                    // Update typing users
                    appStore.setTypingUsers(channelId, result.typingUserIds || []);

                    // Update online users
                    const updatedOnlineUsers = new Set(appStore.onlineUsers);
                    (result.onlineUserIds || []).forEach(id => updatedOnlineUsers.add(id));
                    appStore.onlineUsers = updatedOnlineUsers;

                    // Update member online status
                    appStore.members.forEach(member => {
                        member.isOnline = appStore.onlineUsers.has(member.userId);
                    });

                    // Ensure self is online
                    const authStore = useAuthStore();
                    if (authStore.user?.id) {
                        appStore.onlineUsers.add(authStore.user.id);
                        const selfMember = appStore.members.find(m => m.userId === authStore.user?.id);
                        if (selfMember) {
                            selfMember.isOnline = true;
                        }
                    }

                    return result.typingUserIds || [];
                }
            } catch (error) {
                console.error('Failed to join channel:', error);
            }
        }
        return [];
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