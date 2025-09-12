import * as signalR from '@microsoft/signalr';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import { useFriendStore } from '@/stores/friends';
import { useDmStore } from '@/stores/dm';
import {webrtcService} from './webrtcService.ts';
import {livekitService} from '@/services/livekitService';
import {saveVoiceSession, getVoiceSession, isSessionFresh} from '@/services/voiceSession';
import router from '@/router';
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
    TopicListItem,
} from '@/services/types';

import {UserStatus} from '@/services/types'

export class SignalRService {
    private connection: signalR.HubConnection | null = null;
    reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;
    private connectingWaiters: Array<(v: void) => void> = [];
    // Idle tracking and preferred status
    private idleTimer: number | null = null;
    private readonly idleMs = 15 * 60 * 1000; // 15 minutes
    private preferredStatus: UserStatus | null = null; // null => auto
    private statusRevertTimer: number | null = null;

    constructor() {
        // Handle page unload to properly cleanup
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', async () => {
                try {
                    const appStore = useAppStore();
                    // If currently in a voice channel, persist a fresh timestamp
                    if (appStore.currentServer?.id && appStore.currentVoiceChannelId) {
                        saveVoiceSession(appStore.currentServer.id, appStore.currentVoiceChannelId as number);
                    }
                } catch {}
                await this.cleanup();
            });

            // Activity listeners for idle/active status
            const onActivity = () => this.handleActivity();
            ['mousemove', 'keydown', 'click', 'touchstart', 'focus'].forEach(evt => {
                window.addEventListener(evt, onActivity as any, { passive: true } as any);
            });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) this.handleActivity();
            });
            // Initialize timer
            setTimeout(() => this.handleActivity(), 0);
        }
    }

    private scheduleIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        this.idleTimer = setTimeout(() => {
            // Auto set idle only if not busy/invisible
            if (this.preferredStatus !== UserStatus.Busy && this.preferredStatus !== UserStatus.Invisible) {
                this.setUserStatus(UserStatus.Idle).catch(() => {});
            }
        }, this.idleMs) as unknown as number;
    }

    private handleActivity() {
        // If user manually set Busy/Invisible, do not flip to Online automatically
        if (this.preferredStatus === UserStatus.Busy || this.preferredStatus === UserStatus.Invisible) {
            this.scheduleIdleTimer();
            return;
        }
        this.setUserStatus(UserStatus.Online).catch(() => {});
        this.scheduleIdleTimer();
    }

    private async ensureScreenShareStoppedIfRejoining(serverId: EntityId, channelId: EntityId): Promise<void> {
        try {
            // Ensure local LiveKit screen share is turned off
            try {
                if (livekitService.isScreenSharing()) {
                    await livekitService.stopScreenShare();
                }
            } catch { /* ignore */ }

            // Notify peers via SignalR to clear any stale UI state
            try {
                await this.stopScreenShare(String(serverId), String(channelId));
            } catch { /* ignore */ }

            // Clear local UI indicator immediately
            try {
                const appStore = useAppStore();
                const authStore = useAuthStore();
                if (authStore.user?.id) {
                    appStore.handleUserStoppedScreenShare(channelId as number, authStore.user.id);
                }
            } catch { /* ignore */ }
        } catch { /* ignore */ }
    }

    async initialize(): Promise<void> {
        const authStore = useAuthStore();

        if (!authStore.token) {
            console.error('SignalR: No auth token available');
            return;
        }

        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            // already connected
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
            // connected

            // Register WebRTC listeners now that the connection exists
            webrtcService.setSignalRService(this);

            this.reconnectAttempts = 0;

            // notify any waiters
            this.connectingWaiters.splice(0).forEach(w => { try { w(); } catch {} });
        } catch (error) {
            console.error('SignalR: Failed to start connection', error);
            this.handleConnectionClosed();
        }
    }

    private async ensureConnected(timeoutMs: number = 8000): Promise<void> {
        const authStore = useAuthStore();
        if (!authStore.isAuthenticated) return;
        const state = this.connection?.state;
        if (state === signalR.HubConnectionState.Connected) return;

        if (!this.connection || state === signalR.HubConnectionState.Disconnected) {
            await this.start();
            if (this.connection?.state === signalR.HubConnectionState.Connected) return;
        }

        // Wait until connected or timeout
        await new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => {
                reject(new Error('SignalR connect timeout'));
            }, timeoutMs);
            this.connectingWaiters.push(() => { clearTimeout(t); resolve(); });
        }).catch(() => {});
    }

    private setupEventHandlers(): void {
        if (!this.connection) return;

        const appStore = useAppStore();

        // Message events
        this.connection.on('ReceiveMessage', (message: MessageDto) => {
            
            appStore.handleReceiveMessage(message);
        });

        // Lightweight server-wide channel notification
        this.connection.on('ChannelMessageCreated', (payload: any) => {
            try {
                const { addToast } = useToast();
                const channelId = payload.channelId || payload.ChannelId;
                const serverId = payload.serverId || payload.ServerId;
                const author = payload.authorUsername || payload.AuthorUsername || 'Someone';
                const authorId = payload.authorId || payload.AuthorId;
                const content = (payload.content || payload.Content || '').toString();

                // Only toast if not currently viewing that channel
                const authStore = useAuthStore();
                const isSelf = authStore.user?.id && authorId === authStore.user.id;
                if (!isSelf && appStore.currentChannel?.id !== channelId) {
                    addToast({
                        type: 'info',
                        title: `New message in #${appStore.currentServer?.channels?.find(c => c.id === channelId)?.name || 'channel'}`,
                        message: `${author}: ${content.length > 140 ? content.slice(0, 140) + '…' : content}`,
                        actions: [
                            {
                                label: 'Open',
                                variant: 'primary',
                                action: async () => {
                                    if (serverId && channelId) {
                                        await router.push(`/servers/${serverId}/channels/${channelId}`);
                                    }
                                }
                            }
                        ]
                    });
                }
            } catch {}
        });

        this.connection.on('MessageUpdated', (message: MessageDto) => {
            
            appStore.handleMessageUpdated(message);
        });

        this.connection.on('MessageDeleted', (payload: MessageDeletedPayload) => {
            
            appStore.handleMessageDeleted(payload);
        });

        this.connection.on('ReactionAdded', (payload: ReactionPayload) => {
            
            appStore.handleReactionAdded(payload);
        });

        this.connection.on('ReactionRemoved', (payload: ReactionPayload) => {
            
            appStore.handleReactionRemoved(payload);
        });

        // Channel events
        this.connection.on('ChannelCreated', (channel: ChannelDetailDto) => {
            
            appStore.handleChannelCreated(channel);
        });

        this.connection.on('ChannelUpdated', (channel: ChannelDetailDto) => {
            
            appStore.handleChannelUpdated(channel);
        });

        this.connection.on('ChannelDeleted', (payload: ChannelDeletedPayload) => {
            
            appStore.handleChannelDeleted(payload);
        });

        this.connection.on('TopicCreated', (topic: TopicListItem) => {
            
            appStore.handleTopicCreated(topic);
        });

        this.connection.on('TopicUpdated', (topic: TopicListItem) => {
            
            appStore.handleTopicUpdated(topic);
        });

        this.connection.on('TopicDeleted', (payload: { TopicId: EntityId; ServerId: EntityId }) => {
            
            appStore.handleTopicDeleted(payload);
        });

        // User events
        this.connection.on('UserUpdated', (user: UserProfileDto) => {
            
            appStore.handleUserUpdated(user);
        });

        // --- Friend system realtime events ---
        this.connection.on('FriendRequestReceived', (payload: { RequestId: number; FromUserId: number; FromUsername: string } | any) => {
            try {
                const friendStore = useFriendStore();
                const { addToast } = useToast();
                const req = {
                    requestId: payload.requestId || payload.RequestId,
                    fromUserId: payload.fromUserId || payload.FromUserId,
                    fromUsername: payload.fromUsername || payload.FromUsername,
                } as any;
                friendStore.addIncomingRequest(req);

                addToast({
                    type: 'info',
                    title: 'Friend Request',
                    message: `${req.fromUsername} sent you a friend request`,
                    actions: [
                        { label: 'Accept', variant: 'primary', action: () => friendStore.acceptRequest(req.requestId) },
                        { label: 'Decline', variant: 'secondary', action: () => friendStore.declineRequest(req.requestId) }
                    ]
                });
            } catch (err) { console.warn('FriendRequestReceived handler error', err); }
        });

        this.connection.on('FriendRequestSent', (payload: any) => {
            try {
                const { addToast } = useToast();
                addToast({ type: 'success', title: 'Request Sent', message: `Friend request sent to ${payload.ToUsername || payload.toUsername}` });
            } catch {}
        });

        this.connection.on('FriendRequestAccepted', (friend: any) => {
            try {
                const friendStore = useFriendStore();
                const { addToast } = useToast();
                const f = {
                    userId: friend.userId || friend.UserId,
                    username: friend.username || friend.Username,
                    online: false
                };
                friendStore.addFriendRealtime(f as any);
                addToast({ type: 'success', title: 'Friend Added', message: `${f.username} accepted your request` });
                // Optionally remove request if present
                try { friendStore.removeRequestById(friend.requestId || friend.RequestId); } catch {}
            } catch {}
        });

        this.connection.on('FriendAdded', (friend: any) => {
            try {
                const friendStore = useFriendStore();
                const f = { userId: friend.userId || friend.UserId, username: friend.username || friend.Username, online: false };
                friendStore.addFriendRealtime(f as any);
            } catch {}
        });

        this.connection.on('FriendRequestDeclined', () => {
            try {
                const { addToast } = useToast();
                addToast({ type: 'warning', title: 'Request Declined', message: 'Your friend request was declined.' });
            } catch {}
        });

        this.connection.on('FriendRemoved', (payload: any) => {
            try {
                const friendStore = useFriendStore();
                const { addToast } = useToast();
                const uid = payload.userId || payload.UserId;
                friendStore.removeFriendRealtime(uid);
                addToast({ type: 'info', title: 'Friend Removed', message: 'A friendship was removed.' });
            } catch {}
        });

        // DM typing events (if backend supports)
        this.connection.on('DmUserTyping', (otherUserId: EntityId) => {
            try { useDmStore().setUserTyping(otherUserId, true); } catch {}
        });
        this.connection.on('DmUserStoppedTyping', (otherUserId: EntityId) => {
            try { useDmStore().setUserTyping(otherUserId, false); } catch {}
        });

        // DM message events
        this.connection.on('DmMessageReceived', (message: any) => {
            try { useDmStore().handleReceiveMessage(message); } catch {}
        });
        this.connection.on('DmMessageUpdated', (payload: any) => {
            try { useDmStore().handleMessageUpdated(payload); } catch {}
        });
        this.connection.on('DmMessageDeleted', (payload: any) => {
            try { useDmStore().handleMessageDeleted(payload); } catch {}
        });

        this.connection.on('UserOnline', (userId: EntityId) => {
            
            appStore.handleUserOnline(userId);
        });

        this.connection.on('UserOffline', (userId: EntityId) => {
            
            appStore.handleUserOffline(userId);
        });

        // Connection lifecycle events
        this.connection.onreconnecting(() => {
            
            appStore.setConnectionState('reconnecting');

            // Mark the time we lost connection for voice auto-reconnect window
            if (appStore.currentServer?.id && appStore.currentVoiceChannelId) {
                try { saveVoiceSession(appStore.currentServer.id, appStore.currentVoiceChannelId as number); } catch {}
            }
        });

        this.connection.onreconnected(async () => {
            
            appStore.setConnectionState('connected');

            // Re-join current server and channel after reconnection
            const currentServerId = appStore.currentServer?.id;
            const currentChannelId = appStore.currentChannel?.id;
            const currentVoiceChannelId = appStore.currentVoiceChannelId;

            if (currentServerId) {
                this.joinServer(currentServerId);
            }

            if (currentChannelId) {
                this.joinChannel(currentChannelId);
            }

            // Re-join voice channel if user was in one and session is fresh
            if (currentVoiceChannelId && currentServerId) {
                const session = getVoiceSession();
                if (session && session.serverId === currentServerId && session.channelId === currentVoiceChannelId && isSessionFresh(session)) {
                    await this.joinVoiceChannel(currentServerId, currentVoiceChannelId);
                    await this.ensureScreenShareStoppedIfRejoining(currentServerId, currentVoiceChannelId);
                }
            }
        });

        this.connection.onclose(() => {
            
            appStore.setConnectionState('disconnected');
        });

        this.connection.on('Connected', (onlineUserIds: EntityId[]) => {
            

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

        // Presence mode updates
        this.connection.on('UserStatusSnapshot', (snapshot: Record<string | number, string>) => {
            try {
                Object.entries(snapshot || {}).forEach(([uid, st]) => {
                    const id = typeof uid === 'string' ? parseInt(uid, 10) : (uid as number);
                    appStore.handleUserStatusChanged(id, st as any);
                });
            } catch {}
        });
        this.connection.on('UserStatusChanged', (userId: EntityId | string, status: string) => {
            try {
                const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
                appStore.handleUserStatusChanged(uid, status as any);
            } catch {}
        });

        // Typing indicator
        this.connection.on('UserTyping', (channelId: EntityId, userId: EntityId) => {
            
            appStore.handleUserTyping(channelId, userId);
        });

        this.connection.on('UserStoppedTyping', (channelId: EntityId, userId: EntityId) => {
            
            appStore.handleUserStoppedTyping(channelId, userId);
        });

        // Voice channel events
        this.connection.on('AllUsersInVoiceChannel', (channelId: EntityId | string, users: any[]) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const infos = users.map(u => ({
                userId: typeof u.userId === 'string' ? parseInt(u.userId, 10) : u.userId,
                connectionId: u.connectionId as string,
            }));
            
            appStore.setVoiceChannelUsers(cid, infos.map(i => i.userId));
            appStore.setVoiceChannelConnections(cid, infos);
            webrtcService.connectToExisting(cid, infos);
        });

        // Voice state events (mute/deafen). Support combined or separate events.
        this.connection.on('UserVoiceStateChanged', (channelId: EntityId | string, userId: EntityId | string, muted: boolean, deafened: boolean) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            appStore.setUserVoiceState(cid, uid, { muted, deafened });
        });

        this.connection.on('UserMuted', (channelId: EntityId | string, userId: EntityId | string, muted: boolean) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            const prev = appStore.voiceStates.get(cid)?.get(uid) || { muted: false, deafened: false };
            appStore.setUserVoiceState(cid, uid, { muted, deafened: prev.deafened });
        });

        this.connection.on('UserDeafened', (channelId: EntityId | string, userId: EntityId | string, deafened: boolean) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            const prev = appStore.voiceStates.get(cid)?.get(uid) || { muted: false, deafened: false };
            appStore.setUserVoiceState(cid, uid, { muted: prev.muted, deafened });
        });

        this.connection.on('UserJoinedVoiceChannel', (channelId: EntityId | string, userId: EntityId | string, connectionId: string) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            
            appStore.handleUserJoinedVoiceChannel(cid, uid, connectionId);
            // Only manage WebRTC peers when we are in the same voice channel
            if (appStore.currentVoiceChannelId === cid) {
                webrtcService.addUser(cid, uid, connectionId);
            }
        });

        this.connection.on('UserLeftVoiceChannel', (channelId: EntityId | string, userId: EntityId | string, connectionId: string) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            
            appStore.handleUserLeftVoiceChannel(cid, uid);
            if (appStore.currentVoiceChannelId === cid) {
                webrtcService.removeUser(connectionId);
            }
        });

        this.connection.on('UserStartedScreenShare', (channelId: EntityId, userId: EntityId) => {
            
            appStore.handleUserStartedScreenShare(channelId, userId);
        });

        this.connection.on('UserStoppedScreenShare', (channelId: EntityId, userId: EntityId) => {
            
            appStore.handleUserStoppedScreenShare(channelId, userId);
        });

        // Speaking indicators
        this.connection.on('UserStartedSpeaking', (channelId: EntityId | string, userId: EntityId | string) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            appStore.handleUserStartedSpeaking(cid, uid);
        });
        this.connection.on('UserStoppedSpeaking', (channelId: EntityId | string, userId: EntityId | string) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            appStore.handleUserStoppedSpeaking(cid, uid);
        });

        // Server events
        this.connection.on('ServerCreated', (server: ServerListItemDto) => {
            
            appStore.handleServerCreated(server);
        });

        this.connection.on('ServerUpdated', (server: ServerListItemDto) => {
            
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
        });

        this.connection.on('UserBannedFromServer', (payload: UserServerPayload) => {
            
            appStore.handleUserBannedFromServer(payload);
        });

        // Role events
        this.connection.on('RoleCreated', (role: any) => {
            
            appStore.handleRoleCreated(role);
        });

        this.connection.on('RoleUpdated', (role: any) => {
            
            appStore.handleRoleUpdated(role);
        });

        this.connection.on('RoleDeleted', (roleId: EntityId) => {
            
            appStore.handleRoleDeleted(roleId);
        });

        this.connection.on('MemberRolesUpdated', (payload: any) => {
            
            appStore.handleMemberRolesUpdated(payload);
        });

        // Connection events
        this.connection.onclose(() => {
            
            this.handleConnectionClosed();
        });

        this.connection.onreconnecting(() => {
            
            const {addToast} = useToast();
            addToast({
                type: 'warning',
                title: 'Connection Lost',
                message: 'Attempting to reconnect...',
                duration: 5000
            });
        });

        this.connection.onreconnected(() => {
            
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

            // Re-join voice channel if user was in one and session is fresh
            if (appStore.currentVoiceChannelId && appStore.currentServer?.id) {
                const session = getVoiceSession();
                if (session && session.serverId === appStore.currentServer.id && session.channelId === appStore.currentVoiceChannelId && isSessionFresh(session)) {
                    await this.joinVoiceChannel(appStore.currentServer.id, appStore.currentVoiceChannelId);
                    await this.ensureScreenShareStoppedIfRejoining(appStore.currentServer.id, appStore.currentVoiceChannelId);
                }
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
                
            } catch (error) {
                console.error('Error stopping SignalR connection:', error);
            }
        }
    }

    // Expose setting preferred status manually (Online, Busy, Idle/Away, Invisible)
    setPreferredStatus(status: UserStatus | null) {
        // null means auto (Online/Idle)
        this.preferredStatus = status;
        if (this.statusRevertTimer) { clearTimeout(this.statusRevertTimer); this.statusRevertTimer = null; }
        if (status) {
            this.setUserStatus(status).catch(() => {});
        } else {
            this.handleActivity();
        }
    }

    async setUserStatus(status: UserStatus): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SetUserStatus', status);
                try { useAppStore().setSelfStatus(status); } catch {}
            } catch (e) {
                // ignore
            }
        }
    }

    setPreferredStatusTimed(status: UserStatus, durationMs: number) {
        // Set explicit status and schedule revert to auto/online
        this.setPreferredStatus(status);
        if (this.statusRevertTimer) { clearTimeout(this.statusRevertTimer); this.statusRevertTimer = null; }
        if (durationMs > 0) {
            this.statusRevertTimer = setTimeout(() => {
                this.statusRevertTimer = null;
                // Return to auto (Online/Idle by activity). Force Online immediately.
                this.preferredStatus = null;
                this.setUserStatus(UserStatus.Online).catch(() => {});
                this.handleActivity();
            }, durationMs) as unknown as number;
        }
    }

    private async cleanup(): Promise<void> {
        const appStore = useAppStore();
        
        // If we were screen sharing, explicitly stop and notify before tearing down connection
        try {
            if (appStore.currentServer?.id && appStore.currentVoiceChannelId && livekitService.isScreenSharing()) {
                try { await livekitService.stopScreenShare(); } catch {}
                try { await this.stopScreenShare(String(appStore.currentServer.id), String(appStore.currentVoiceChannelId)); } catch {}
            }
        } catch { /* ignore */ }

        // If user is in a voice channel, leave it
        if (appStore.currentVoiceChannelId && appStore.currentServer) {
            try {
                await this.leaveVoiceChannel(appStore.currentServer.id, appStore.currentVoiceChannelId);
            } catch (error) {
                console.warn('Failed to leave voice channel during cleanup:', error);
            }
        }
        
        // Stop the connection
        await this.stop();
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
        await this.ensureConnected();
        if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
        try {
            await this.connection.invoke('JoinServer', serverId.toString());
            // After joining the server group, fetch current voice/screen-share state for sidebar indicators
            try {
                const status = await this.connection.invoke<any>('GetServerVoiceStatus', serverId.toString());
                if (status) {
                    const appStore = useAppStore();
                    // Apply screen shares
                    const screenShares: Record<string | number, number[]> = status.screenShares || status.ScreenShares || {};
                    Object.keys(screenShares).forEach((cid) => {
                        const chId = typeof cid === 'string' ? parseInt(cid, 10) : (cid as number);
                        const users = screenShares[cid] || [];
                        const current = appStore.screenShares.get(chId) || new Set<number>();
                        const next = new Set(current);
                        users.forEach(u => next.add(typeof u === 'string' ? parseInt(u as any, 10) : u));
                        const overall = new Map(appStore.screenShares);
                        overall.set(chId, next);
                        appStore.screenShares = overall as any;
                    });

                    // Apply voice states
                    const voiceStates: Record<string | number, Record<string | number, { muted: boolean; deafened: boolean }>> = status.voiceStates || status.VoiceStates || {};
                    Object.keys(voiceStates).forEach((cid) => {
                        const chId = typeof cid === 'string' ? parseInt(cid, 10) : (cid as number);
                        const userMap = voiceStates[cid] || {};
                        const channelMap = new Map(appStore.voiceStates.get(chId) || []);
                        Object.keys(userMap).forEach((uidKey) => {
                            const uid = typeof uidKey === 'string' ? parseInt(uidKey, 10) : (uidKey as number);
                            const st = userMap[uidKey];
                            channelMap.set(uid, { muted: !!st.muted, deafened: !!st.deafened });
                        });
                        const overall = new Map(appStore.voiceStates);
                        overall.set(chId, channelMap);
                        appStore.voiceStates = overall;
                    });

                    // Apply voice users present so sidebar shows current occupants
                    const voiceUsers: Record<string | number, Array<string | number>> = status.voiceUsers || status.VoiceUsers || {};
                    Object.keys(voiceUsers).forEach((cid) => {
                        const chId = typeof cid === 'string' ? parseInt(cid, 10) : (cid as number);
                        const raw = voiceUsers[cid] || [];
                        const ids = raw.map(u => (typeof u === 'string' ? parseInt(u as any, 10) : (u as number)));
                        appStore.setVoiceChannelUsers(chId, ids as any);
                    });
                }
            } catch (err) {
                // Snapshot fetch is best-effort; ignore errors
                console.warn('GetServerVoiceStatus failed:', err);
            }
        } catch (error) {
            console.error('Failed to join server:', error);
        }
    }

    // --- DM Typing ---
    async sendDmTypingIndicator(otherUserId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SendDmTypingIndicator', otherUserId.toString());
                try { useDmStore().setUserTyping(otherUserId, true); } catch {}
            } catch (error) {
                console.error('Failed to send DM typing indicator:', error);
            }
        }
    }

    async stopDmTypingIndicator(otherUserId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('StopDmTypingIndicator', otherUserId.toString());
                try { useDmStore().setUserTyping(otherUserId, false); } catch {}
            } catch (error) {
                console.error('Failed to send DM stop typing indicator:', error);
            }
        }
    }

    async leaveServer(serverId: EntityId): Promise<void> {
        if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
        try {
            await this.connection.invoke('LeaveServer', serverId.toString());
        } catch (error) {
            console.error('Failed to leave server:', error);
        }
    }

    async joinChannel(channelId: EntityId): Promise<EntityId[]> {
        await this.ensureConnected();
        if (this.connection?.state !== signalR.HubConnectionState.Connected) return [];
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
        return [];
    }

    async leaveChannel(channelId: EntityId): Promise<void> {
        if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
        try {
            await this.connection.invoke('LeaveChannel', channelId.toString());
        } catch (error) {
            console.error('Failed to leave channel:', error);
        }
    }

    async joinVoiceChannel(serverId: EntityId, channelId: EntityId): Promise<void> {
        await this.ensureConnected();
        if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
        try {
            await this.connection.invoke('JoinVoiceChannel', serverId.toString(), channelId.toString());
        } catch (error) {
            console.error('Failed to join voice channel:', error);
            throw error;
        }
    }

    // Update own voice states (backend method names may vary; provide both combined and separate forms)
    async updateVoiceState(channelId: EntityId, muted: boolean, deafened: boolean): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('UpdateVoiceState', channelId.toString(), muted, deafened);
            } catch {
                // Fallback to separate invocations if combined is not available
                try { await this.connection.invoke('SetMuteState', channelId.toString(), muted); } catch {}
                try { await this.connection.invoke('SetDeafenState', channelId.toString(), deafened); } catch {}
            }
        }
    }

    async leaveVoiceChannel(serverId: EntityId, channelId: EntityId): Promise<void> {
        if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
        try {
            await this.connection.invoke('LeaveVoiceChannel', serverId.toString(), channelId.toString());
        } catch (error) {
            console.error('Failed to leave voice channel:', error);
        }
    }

    async sendOffer(targetConnectionId: string, offer: any): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SendOffer', targetConnectionId, offer);
            } catch (error) {
                console.error('Failed to send offer:', error);
            }
        }
    }

    async sendAnswer(targetConnectionId: string, answer: any): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SendAnswer', targetConnectionId, answer);
            } catch (error) {
                console.error('Failed to send answer:', error);
            }
        }
    }

    async sendIceCandidate(targetConnectionId: string, candidate: any): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SendIceCandidate', targetConnectionId, candidate);
            } catch (error) {
                console.error('Failed to send ICE candidate:', error);
            }
        }
    }

    async startSpeaking(channelId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('StartSpeaking', channelId.toString());
            } catch (error) {
                console.error('Failed to notify speaking start:', error);
            }
        }
    }

    async stopSpeaking(channelId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('StopSpeaking', channelId.toString());
            } catch (error) {
                console.error('Failed to notify speaking stop:', error);
            }
        }
    }

    async startScreenShare(serverId: string, channelId: string): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('StartScreenShare', serverId, channelId);
            } catch (error) {
                console.error('Failed to notify screen share start:', error);
            }
        }
    }

    async stopScreenShare(serverId: string, channelId: string): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('StopScreenShare', serverId, channelId);
            } catch (error) {
                console.error('Failed to notify screen share stop:', error);
            }
        }
    }

    /**
     * Allows external components to subscribe to SignalR events.
     */
    on(event: string, callback: (...args: any[]) => void): void {
        if (this.connection) {
            this.connection.on(event, callback);
        }
    }

    /**
     * Removes a previously registered SignalR event listener.
     */
    off(event: string, callback: (...args: any[]) => void): void {
        if (this.connection) {
            this.connection.off(event, callback);
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
