import * as signalR from '@microsoft/signalr';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import { useNotify } from '@/composables/useNotify';
import { useFriendStore } from '@/stores/friends';
import { useDmStore } from '@/stores/dm';
import {webrtcService} from './webrtcService.ts';
import {livekitService} from '@/services/livekitService';
import { summarizeMessagePreview } from '@/utils/messageSummary';
import { i18n } from '@/i18n';
import {saveVoiceSession, getVoiceSession, isSessionFresh} from '@/services/voiceSession';
import router from '@/router';
import { playChime } from '@/utils/sounds';
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
    private handlersBound = false;
    // Idle tracking and preferred status
    private idleTimer: number | null = null;
    private readonly idleMs = 15 * 60 * 1000; // 15 minutes
    private preferredStatus: UserStatus | null = null; // null => auto
    private statusRevertTimer: number | null = null;
    private readonly statusStorageKey = 'dumcsi:userStatusPref';

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

            // On page load, hydrate preferred status from storage if present
            try {
                const raw = localStorage.getItem(this.statusStorageKey);
                if (raw) {
                    const data = JSON.parse(raw || '{}') as { status?: UserStatus; expiresAt?: number | null };
                    const now = Date.now();
                    if (data.status && (data.expiresAt == null || data.expiresAt > now)) {
                        // Defer applying until connection is up via Connected handler
                        this.preferredStatus = data.status as UserStatus;
                    } else {
                        localStorage.removeItem(this.statusStorageKey);
                    }
                }
            } catch {}
        }
    }

    private async joinAllServers(): Promise<void> {
        try {
            await this.ensureConnected();
            const appStore = useAppStore();
            const list = appStore.servers || [];
            for (const s of list) {
                try { await this.joinServer(s.id); } catch {}
            }
        } catch {}
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

            // Best-effort: immediately join all known servers (in case Connected handler runs later)
            try {
                const appStore = useAppStore();
                if (appStore.servers && appStore.servers.length > 0) {
                    appStore.servers.forEach(s => { try { this.joinServer(s.id); } catch {} });
                }
            } catch {}

            // Best-effort: immediately join all known servers so server-wide events arrive
            try { await this.joinAllServers(); } catch {}

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
        if (this.handlersBound) return; // Avoid duplicate bindings

        const appStore = useAppStore();

        // Message events
        this.connection.on('ReceiveMessage', (message: MessageDto) => {
            
            appStore.handleReceiveMessage(message);
        });

        // Lightweight server-wide channel notification
        this.connection.on('ChannelMessageCreated', (payload: any) => {
            try {
                const { addToast } = useToast();
                // Use nullish coalescing so valid 0 values are preserved, then normalize to numbers
                const channelIdRaw = (payload?.channelId ?? payload?.ChannelId);
                const serverIdRaw = (payload?.serverId ?? payload?.ServerId);
                const authorIdRaw = (payload?.authorId ?? payload?.AuthorId);
                const author = payload?.authorUsername ?? payload?.AuthorUsername ?? i18n.global.t('common.misc.someone');
                const content = String(payload?.content ?? payload?.Content ?? '');
                const channelId = typeof channelIdRaw === 'string' ? parseInt(channelIdRaw, 10) : Number(channelIdRaw);
                const serverId = typeof serverIdRaw === 'string' ? parseInt(serverIdRaw, 10) : Number(serverIdRaw);
                const authorId = typeof authorIdRaw === 'string' ? parseInt(authorIdRaw, 10) : Number(authorIdRaw);
                const preview = summarizeMessagePreview(content, null, 140);

                // Show toast for server messages everywhere (except Settings view),
                // but suppress if currently viewing that exact channel
                const authStore = useAuthStore();
                const isSelf = !!authStore.user?.id && Number(authorId) === Number(authStore.user.id);
                // Skip toasts while on Settings for cleaner UX
                const route = router.currentRoute?.value;
                const onSettings = !!route && (String(route.name || '').toLowerCase().includes('settings') || String(route.path || '').includes('/settings'));
                const isActiveChannel = Number(appStore.currentServer?.id) === Number(serverId) && Number(appStore.currentChannel?.id) === Number(channelId);
                if (!isSelf && !onSettings && !isActiveChannel) {
                    const channelName = appStore.currentServer?.channels?.find(c => Number(c.id) === Number(channelId))?.name || i18n.global.t('channels.nameDefault');
                    const serverName = (appStore.servers.find(s => Number(s.id) === Number(serverId))?.name) || appStore.currentServer?.name || i18n.global.t('server.nameDefault');
                    addToast({
                        type: 'info',
                        title: `${serverName} • #${channelName}`,
                        message: `${author}: ${preview || i18n.global.t('common.notifications.sentMessage')}`,
                        notificationCategory: 'server',
                        onClick: async () => {
                            if (!Number.isNaN(serverId) && !Number.isNaN(channelId)) {
                                await router.push(`/servers/${Number(serverId)}/channels/${Number(channelId)}`);
                            }
                        },
                        // Auto-dismiss after a short delay even with actions
                        duration: 6000,
                        actions: [
                            {
                                label: i18n.global.t('common.actions.mute'),
                                variant: 'secondary',
                                action: async () => {
                                    try {
                                        const { useNotificationPrefs } = await import('@/stores/notifications');
                                        const prefs = useNotificationPrefs();
                                        const { addToast } = useToast();
                                        // Show quick duration chooser as a follow-up toast
                                        addToast({
                                            type: 'info',
                                            title: i18n.global.t('common.notifications.muteChannelTitle'),
                                            message: i18n.global.t('common.notifications.chooseDurationFor', { name: channelName }),
                                            actions: [
                                                { label: i18n.global.t('common.durationShort.m15'), action: () => prefs.muteChannel(Number(serverId), Number(channelId), prefs.Durations.m15) },
                                                { label: i18n.global.t('common.durationShort.h1'), action: () => prefs.muteChannel(Number(serverId), Number(channelId), prefs.Durations.h1) },
                                                { label: i18n.global.t('common.durationShort.h3'), action: () => prefs.muteChannel(Number(serverId), Number(channelId), prefs.Durations.h3) },
                                                { label: i18n.global.t('common.durationShort.h8'), action: () => prefs.muteChannel(Number(serverId), Number(channelId), prefs.Durations.h8) },
                                                { label: i18n.global.t('common.durationShort.h24'), action: () => prefs.muteChannel(Number(serverId), Number(channelId), prefs.Durations.h24) },
                                                { label: i18n.global.t('common.durationShort.untilOn'), action: () => prefs.muteChannel(Number(serverId), Number(channelId), 'forever'), variant: 'secondary' },
                                            ],
                                            duration: 0,
                                            meta: { serverId: Number(serverId), channelId: Number(channelId) }
                                        });
                                    } catch {}
                                }
                            },
                            {
                                label: i18n.global.t('common.actions.open'),
                                variant: 'primary',
                                action: async () => {
                                    if (serverId && channelId) {
                                        await router.push(`/servers/${serverId}/channels/${channelId}`);
                                    }
                                }
                            }
                        ],
                        meta: { serverId: Number(serverId), channelId: Number(channelId) }
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
            try {
                // Notify if someone reacted to my message
                const authId = useAuthStore().user?.id;
                if (!authId) return;
                const msg = (useAppStore().messages || []).find(m => m.id === payload.messageId);
                if (msg && msg.author?.id === authId && payload.userId !== authId) {
                    const { notify } = useNotify();
                    notify({
                        category: 'toast',
                        title: i18n.global.t('chat.notifications.reaction.title'),
                        message: i18n.global.t('chat.notifications.reaction.message'),
                        showToast: true,
                        playSound: true,
                        showBrowser: false,
                        toast: { type: 'info' }
                    });
                }
            } catch {}
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
        this.connection.on('FriendRequestReceived', async (payload: { RequestId: number; FromUserId: number; FromUsername: string } | any) => {
            try {
                const friendStore = useFriendStore();
                const req = {
                    requestId: payload.requestId || payload.RequestId,
                    fromUserId: payload.fromUserId || payload.FromUserId,
                    fromUsername: payload.fromUsername || payload.FromUsername,
                } as any;
                friendStore.addIncomingRequest(req);

                // Global notification (toast category) with actions; allow browser + sound
                try {
                    const { notify } = useNotify();
                    notify({
                        category: 'toast',
                        title: 'Friend Request',
                        message: `${req.fromUsername} sent you a friend request`,
                        showToast: true,
                        playSound: false,
                        showBrowser: true,
                        toast: {
                            type: 'info',
                            actions: [
                                { label: 'Accept', variant: 'primary', action: () => friendStore.acceptRequest(req.requestId) },
                                { label: 'Decline', variant: 'secondary', action: () => friendStore.declineRequest(req.requestId) }
                            ]
                        }
                    });
                } catch {}
                // Play dedicated UI sound (user setting-controlled)
                try { const { useUiSounds } = await import('@/stores/uiSounds'); useUiSounds().play('friendRequest'); } catch {}
            } catch (err) { console.warn('FriendRequestReceived handler error', err); }
        });

        this.connection.on('FriendRequestSent', (payload: any) => {
            try {
                const { notify } = useNotify();
                notify({ category: 'toast', title: 'Request Sent', message: `Friend request sent to ${payload.ToUsername || payload.toUsername}`, showToast: true, playSound: false, showBrowser: false, toast: { type: 'success' } });
            } catch {}
        });

        this.connection.on('FriendRequestAccepted', (friend: any) => {
            try {
                const friendStore = useFriendStore();
                const f = {
                    userId: friend.userId || friend.UserId,
                    username: friend.username || friend.Username,
                    online: false
                };
                friendStore.addFriendRealtime(f as any);
                // Remove request if present
                try { friendStore.removeRequestById(friend.requestId || friend.RequestId); } catch {}
                const { notify } = useNotify();
                notify({ category: 'toast', title: 'Friend Added', message: `${f.username} accepted your request`, showToast: true, playSound: false, showBrowser: true, toast: { type: 'success' } });
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
                const { notify } = useNotify();
                notify({ category: 'toast', title: 'Request Declined', message: 'Your friend request was declined.', showToast: true, playSound: false, showBrowser: false, toast: { type: 'warning' } });
            } catch {}
        });

        this.connection.on('FriendRemoved', (payload: any) => {
            try {
                const friendStore = useFriendStore();
                const uid = payload.userId || payload.UserId;
                friendStore.removeFriendRealtime(uid);
                const { notify } = useNotify();
                notify({ category: 'toast', title: 'Friend Removed', message: 'A friendship was removed.', showToast: true, playSound: false, showBrowser: false, toast: { type: 'info' } });
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
            // Emit a single, centralized DM toast here (only for messages from others)
            try {
                const { addToast } = useToast();
                const auth = useAuthStore();
                // Normalize sender/receiver fields from possible shapes
                const senderIdRaw = message?.senderId ?? message?.SenderId ?? message?.sender?.id ?? message?.Sender?.Id;
                const senderId = typeof senderIdRaw === 'string' ? parseInt(senderIdRaw, 10) : Number(senderIdRaw);
                const selfId = auth.user?.id ? Number(auth.user.id) : null;
                const fromOther = selfId != null && senderId !== selfId;
                if (!fromOther) return; // Do not show a DM toast for own messages

                const fromUser = message?.sender?.username || message?.Sender?.Username || 'User';
                const text = String(message?.content ?? message?.Content ?? '');

                // Other user in this conversation (for navigation/mute)
                const otherId = senderId; // since fromOther is true, sender is the other participant

                // Suppress if currently viewing this DM conversation
                const route = router.currentRoute?.value;
                const onThisDm = !!otherId && !!route?.path && route.path.includes(`/dm/${otherId}`);
                if (onThisDm) return;

                addToast({
                    type: 'info',
                    title: `New DM from ${fromUser}`,
                    message: text.length > 140 ? text.slice(0, 140) + '…' : text,
                    onClick: async () => { if (otherId) await router.push(`/dm/${otherId}`); },
                    quickReply: {
                        placeholder: 'Quick reply…',
                        onSend: async (t: string) => { try { await useDmStore().sendMessage(otherId, { content: t }); } catch {} }
                    },
                    duration: 6000,
                    meta: { dmUserId: Number(otherId) },
                    notificationCategory: 'dm',
                });
            } catch {}
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

        this.connection.on('Connected', async (onlineUserIds: EntityId[]) => {
            

            // Set all online users
            appStore.onlineUsers = new Set(onlineUserIds);

            // Update member objects if we have them, but do not override custom status
            appStore.members.forEach(member => {
                member.isOnline = appStore.onlineUsers.has(member.userId);
                if (!member.isOnline) member.status = UserStatus.Offline;
                // If online, keep existing status; a UserStatusSnapshot will refine shortly
            });

            // Ensure own online flag; keep chosen status
            const authStore = useAuthStore();
            if (authStore.user?.id) {
                appStore.onlineUsers.add(authStore.user.id);
                const selfMember = appStore.members.find(m => m.userId === authStore.user?.id);
                if (selfMember) {
                    selfMember.isOnline = true;
                    selfMember.status = (selfMember.status ?? UserStatus.Online) as UserStatus;
                }
            }

            // Join all servers to receive server-wide channel notifications (ChannelMessageCreated)
            try { await this.joinAllServers(); } catch {}

            // Re-apply stored preferred status after connection (survives refresh)
            try {
                const raw = localStorage.getItem(this.statusStorageKey);
                if (raw) {
                    const data = JSON.parse(raw || '{}') as { status?: UserStatus; expiresAt?: number | null };
                    if (data.status) {
                        const now = Date.now();
                        if (data.expiresAt && data.expiresAt <= now) {
                            // expired -> clear and revert to online
                            localStorage.removeItem(this.statusStorageKey);
                            this.preferredStatus = null;
                            await this.setUserStatus(UserStatus.Online);
                            this.handleActivity();
                        } else if (data.expiresAt && data.expiresAt > now) {
                            const remaining = data.expiresAt - now;
                            this.setPreferredStatusTimed(data.status as UserStatus, remaining);
                        } else {
                            // Forever
                            this.setPreferredStatus(data.status as UserStatus);
                        }
                    }
                }
            } catch {}
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
                // Subtle UI sound for join (respect toast category prefs + DND)
                try {
                    const RAW_KEY = 'dumcsi:notification-prefs:v1';
                    const raw = localStorage.getItem(RAW_KEY);
                    const defaults = { categories: { toast: { enabled: true, playSound: false, volume: 0.5, respectDnd: true } } } as const;
                    const cfg = raw ? { ...defaults, ...(JSON.parse(raw) || {}) } : defaults;
                    const cat = (cfg as any).categories?.toast || defaults.categories.toast;
                    const isDnd = appStore.selfStatus === (UserStatus as any).Busy;
                    if (cat.enabled && cat.playSound && !(cat.respectDnd && isDnd)) {
                        void playChime('toast', Number(cat.volume ?? 0.5));
                    }
                } catch {}
            }
        });

        this.connection.on('UserLeftVoiceChannel', (channelId: EntityId | string, userId: EntityId | string, connectionId: string) => {
            const cid = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
            const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
            
            appStore.handleUserLeftVoiceChannel(cid, uid);
            if (appStore.currentVoiceChannelId === cid) {
                webrtcService.removeUser(connectionId);
                // Subtle UI sound for leave (respect toast category prefs + DND)
                try {
                    const RAW_KEY = 'dumcsi:notification-prefs:v1';
                    const raw = localStorage.getItem(RAW_KEY);
                    const defaults = { categories: { toast: { enabled: true, playSound: false, volume: 0.5, respectDnd: true } } } as const;
                    const cfg = raw ? { ...defaults, ...(JSON.parse(raw) || {}) } : defaults;
                    const cat = (cfg as any).categories?.toast || defaults.categories.toast;
                    const isDnd = appStore.selfStatus === (UserStatus as any).Busy;
                    if (cat.enabled && cat.playSound && !(cat.respectDnd && isDnd)) {
                        void playChime('toast', Number(cat.volume ?? 0.5));
                    }
                } catch {}
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
        this.handlersBound = true;
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
            this.handlersBound = false;
        }
    }

    // Expose setting preferred status manually (Online, Busy, Idle/Away, Invisible)
    setPreferredStatus(status: UserStatus | null) {
        // null means auto (Online/Idle)
        this.preferredStatus = status;
        if (this.statusRevertTimer) { clearTimeout(this.statusRevertTimer); this.statusRevertTimer = null; }
        if (status) {
            this.setUserStatus(status).catch(() => {});
            // Persist locally as forever
            try { localStorage.setItem(this.statusStorageKey, JSON.stringify({ status, expiresAt: null })); } catch {}
        } else {
            this.handleActivity();
            try { localStorage.removeItem(this.statusStorageKey); } catch {}
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
        // Persist timed status to backend and also schedule client-side fallback revert
        this.preferredStatus = status;
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try { this.connection.invoke('SetUserStatusTimed', status, durationMs).catch(() => {}); } catch {}
        } else {
            // If not connected, at least reflect locally and try to connect-set later
            this.setUserStatus(status).catch(() => {});
        }

        if (this.statusRevertTimer) { clearTimeout(this.statusRevertTimer); this.statusRevertTimer = null; }
        if (durationMs > 0) {
            this.statusRevertTimer = setTimeout(() => {
                this.statusRevertTimer = null;
                // Return to auto (Online/Idle by activity). Force Online immediately.
                this.preferredStatus = null;
                this.setUserStatus(UserStatus.Online).catch(() => {});
                this.handleActivity();
                try { localStorage.removeItem(this.statusStorageKey); } catch {}
            }, durationMs) as unknown as number;
            // Save with expiry
            try { localStorage.setItem(this.statusStorageKey, JSON.stringify({ status, expiresAt: Date.now() + durationMs })); } catch {}
        }
        else {
            // Forever
            try { localStorage.setItem(this.statusStorageKey, JSON.stringify({ status, expiresAt: null })); } catch {}
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
            } catch (error) {
                console.error('Failed to send DM typing indicator:', error);
            }
        }
    }

    async stopDmTypingIndicator(otherUserId: EntityId): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('StopDmTypingIndicator', otherUserId.toString());
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
            // Local UI confirm sound (toast category prefs)
            try {
                const appStore = useAppStore();
                const RAW_KEY = 'dumcsi:notification-prefs:v1';
                const raw = localStorage.getItem(RAW_KEY);
                const defaults = { categories: { toast: { enabled: true, playSound: false, volume: 0.5, respectDnd: true } } } as const;
                const cfg = raw ? { ...defaults, ...(JSON.parse(raw) || {}) } : defaults;
                const cat = (cfg as any).categories?.toast || defaults.categories.toast;
                const isDnd = appStore.selfStatus === (UserStatus as any).Busy;
                if (cat.enabled && cat.playSound && !(cat.respectDnd && isDnd)) {
                    void playChime('toast', Number(cat.volume ?? 0.5));
                }
            } catch {}
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
            // Local UI confirm sound (toast category prefs)
            try {
                const appStore = useAppStore();
                const RAW_KEY = 'dumcsi:notification-prefs:v1';
                const raw = localStorage.getItem(RAW_KEY);
                const defaults = { categories: { toast: { enabled: true, playSound: false, volume: 0.5, respectDnd: true } } } as const;
                const cfg = raw ? { ...defaults, ...(JSON.parse(raw) || {}) } : defaults;
                const cat = (cfg as any).categories?.toast || defaults.categories.toast;
                const isDnd = appStore.selfStatus === (UserStatus as any).Busy;
                if (cat.enabled && cat.playSound && !(cat.respectDnd && isDnd)) {
                    void playChime('toast', Number(cat.volume ?? 0.5));
                }
            } catch {}
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
