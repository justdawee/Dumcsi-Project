import {defineStore} from 'pinia';
import {computed, ref} from 'vue';
import type {
    ChannelDeletedPayload,
    ChannelDetailDto,
    CreateChannelRequest,
    CreateInviteRequest,
    CreateMessageRequest,
    CreateServerRequest,
    EntityId,
    MessageDeletedPayload,
    MessageDto,
    ReactionPayload,
    ServerDetails,
    ServerListItem,
    ServerListItemDto,
    ServerMember,
    TopicListItem,
    UpdateChannelRequest,
    UpdateMessageRequest,
    UpdateServerRequest,
    UserProfileDto,
    UserServerPayload,
} from '@/services/types';
import {UserStatus} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';
import {signalRService} from '@/services/signalrService';
import {saveVoiceSession, clearVoiceSession} from '@/services/voiceSession';
import {webrtcService} from '@/services/webrtcService';
import router from '@/router';
import {useToast} from '@/composables/useToast';
import {useAuthStore} from './auth';

export const useAppStore = defineStore('app', () => {
    // State
    const servers = ref<ServerListItem[]>([]);
    const currentServer = ref<ServerDetails | null>(null);
    const currentChannel = ref<ChannelDetailDto | null>(null);
    const messages = ref<MessageDto[]>([]);
    const members = ref<ServerMember[]>([]);
    const onlineUsers = ref<Set<EntityId>>(new Set());
    const typingUsers = ref<Map<EntityId, Set<EntityId>>>(new Map());
    const voiceChannelUsers = ref<Map<EntityId, UserProfileDto[]>>(new Map());
    const voiceChannelConnections = ref<Map<EntityId, Map<EntityId, string>>>(new Map());
    const screenShares = ref<Map<EntityId, Set<EntityId>>>(new Map());
    const voiceStates = ref<Map<EntityId, Map<EntityId, { muted: boolean; deafened: boolean }>>>(new Map());
    const currentVoiceChannelId = ref<EntityId | null>(null);
    const selfMuted = ref(false);
    const selfDeafened = ref(false);
    const connectionState = ref<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');


    const isCreateChannelModalOpen = ref(false);
    const createChannelForServerId = ref<EntityId | null>(null);

    const setConnectionState = (state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => {
        connectionState.value = state;

        // When connected, add self to online users
        if (state === 'connected') {
            const authStore = useAuthStore();
            if (authStore.user?.id) {
                onlineUsers.value.add(authStore.user.id);
            }
        }
    };

    const loading = ref({
        servers: false,
        server: false,
        channel: false,
        messages: false,
        members: false,
    });

    const error = ref<string | null>(null);
    const {addToast} = useToast();

    // Computed
    const currentUserId = computed(() => {
        const authStore = useAuthStore();
        return authStore.user?.id || null;
    });

    const getUserProfile = (userId: EntityId): UserProfileDto | null => {
        const authStore = useAuthStore();
        
        // Check if this is the current user and get profile from auth store if available
        if (userId === authStore.user?.id && authStore.user) {
            return {
                id: authStore.user.id,
                username: authStore.user.username,
                globalNickname: authStore.user.globalNickname || null,
                email: authStore.user.email || '',
                avatar: authStore.user.avatar || null,
                locale: authStore.user.locale || null,
                verified: authStore.user.verified || null,
            };
        }
        
        // Otherwise look in server members
        const member = members.value.find(m => m.userId === userId);
        if (!member) return null;
        return {
            id: member.userId,
            username: member.username,
            globalNickname: member.globalNickname,
            email: '',
            avatar: member.avatarUrl,
            locale: null,
            verified: null,
        };
    };

    // Helper for API calls
    const handleApiCall = async <T>(
        loadingKey: keyof typeof loading.value,
        apiCall: () => Promise<T>
    ): Promise<T | null> => {
        loading.value[loadingKey] = true;
        error.value = null;
        try {
            return await apiCall();
        } catch (err: any) {
            error.value = err.message || 'An error occurred';
            console.error(err);
            addToast({
                type: 'danger',
                message: error.value || 'An unknown error occurred',
            });
            return null;
        } finally {
            loading.value[loadingKey] = false;
        }
    };

    // Server Actions
    const fetchServers = async () => {
        const result = await handleApiCall('servers', () => serverService.getServers());
        if (result) servers.value = result;
    };

    const fetchServer = async (serverId: EntityId) => {
        try {
            const result = await serverService.getServer(serverId);
            if (result) {
                currentServer.value = result;
                await fetchServerMembers(serverId);
                
                // Join the server SignalR group to receive server-wide events (including voice channel updates)
                try {
                    await signalRService.joinServer(serverId);
                    
                } catch (error) {
                    
                }
            }
        } catch (err: any) {
            // Handle 403 specifically - user is not a member of this server
            if (err.response?.status === 403) {
                console.warn('Access denied to server', serverId, 'User may have been removed');
                // Remove server from user's server list if it exists
                servers.value = servers.value.filter(s => s.id !== serverId);
                // Clear current server if it's the one being accessed
                if (currentServer.value?.id === serverId) {
                    currentServer.value = null;
                }
                // Redirect to server select
                router.push({ name: 'ServerSelect' });
                addToast({
                    type: 'warning',
                    message: 'You no longer have access to this server.',
                    duration: 5000
                });
                return;
            }
            
            // Handle other errors with generic error handling
            error.value = err.message || 'An error occurred';
            console.error(err);
            addToast({
                type: 'danger',
                message: error.value || 'An unknown error occurred',
            });
        }
    };

    const fetchServerMembers = async (serverId: EntityId) => {
        const result = await handleApiCall('members', () =>
            serverService.getServerMembers(serverId)
        );

        if (result) {
            members.value = result;

            // Update member objects with current online status
            members.value.forEach(member => {
                member.isOnline = onlineUsers.value.has(member.userId);
                member.status = member.isOnline ? UserStatus.Online : UserStatus.Offline;
            });

            // Ensure self is marked as online
            const authStore = useAuthStore();
            const currentUserId = authStore.user?.id;
            if (currentUserId) {
                onlineUsers.value.add(currentUserId);
                const selfMember = members.value.find(m => m.userId === currentUserId);
                if (selfMember) {
                    selfMember.isOnline = true;
                    selfMember.status = UserStatus.Online;
                }
            }
        }
    };


    const createServer = async (payload: CreateServerRequest) => {
        const result = await serverService.createServer(payload);
        await fetchServers();
        await router.push(`/servers/${result.serverId}`);
        return result;
    };

    const updateServer = async (serverId: EntityId, payload: UpdateServerRequest) => {
        await serverService.updateServer(serverId, payload);
        await fetchServer(serverId);
        await fetchServers();
    };

    const deleteServer = async (serverId: EntityId) => {
        await serverService.deleteServer(serverId);
        await fetchServers();
        await router.push('/servers');
    };

    const leaveServer = async (serverId: EntityId) => {
        await serverService.leaveServer(serverId);
        await fetchServers();
        await router.push('/servers');
    };

    const generateInvite = async (serverId: EntityId, payload?: CreateInviteRequest) => {
        return await serverService.generateInvite(serverId, payload);
    };

    const joinServerWithInvite = async (inviteCode: string) => {
        const result = await serverService.joinServer(inviteCode);
        await fetchServers();
        return result;
    };

    const joinPublicServer = async (serverId: EntityId) => {
        const result = await serverService.joinPublicServer(serverId);
        await fetchServers();
        return result;
    };

    // Channel Actions
    const fetchChannel = async (channelId: EntityId) => {
        try {
            const result = await channelService.getChannel(channelId);
            if (result) {
                currentChannel.value = result;
                await fetchMessages(channelId);
            }
        } catch (err: any) {
            // Handle 403 specifically - user doesn't have access to this channel/server
            if (err.response?.status === 403) {
                console.warn('Access denied to channel', channelId, 'User may have been removed from server');
                // Clear current channel
                currentChannel.value = null;
                // Redirect to server select
                router.push({ name: 'ServerSelect' });
                addToast({
                    type: 'warning',
                    message: 'You no longer have access to this channel.',
                    duration: 5000
                });
                return;
            }
            
            // Handle other errors with generic error handling
            error.value = err.message || 'An error occurred';
            console.error(err);
            addToast({
                type: 'danger',
                message: error.value || 'An unknown error occurred',
            });
        }
    };

    const updateCurrentChannelDetails = (details: Partial<ChannelDetailDto>) => {
        if (currentChannel.value) {
            currentChannel.value = {...currentChannel.value, ...details};
        }
    };

    const createChannel = async (serverId: EntityId, payload: CreateChannelRequest) => {
        const result = await serverService.createChannel(serverId, payload);
        await fetchServer(serverId);
        return result;
    };

    const updateChannel = async (channelId: EntityId, payload: UpdateChannelRequest) => {
        await channelService.updateChannel(channelId, payload);
        if (currentChannel.value?.id === channelId) {
            await fetchChannel(channelId);
        }
        if (currentServer.value) {
            await fetchServer(currentServer.value.id);
        }
    };

    const updateTopic = async (topicId: EntityId, payload: { name?: string | null; position?: number | null }) => {
        await serverService.updateTopic(topicId, payload);
        if (currentServer.value) {
            await fetchServer(currentServer.value.id);
        }
    };

    const deleteChannel = async (channelId: EntityId) => {
        await channelService.deleteChannel(channelId);
        if (currentServer.value) {
            await fetchServer(currentServer.value.id);
            const firstChannel = currentServer.value.channels?.find(ch => ch.type === 0);
            if (firstChannel) {
                await router.push(`/servers/${currentServer.value.id}/channels/${firstChannel.id}`);
            } else {
                await router.push(`/servers/${currentServer.value.id}`);
            }
        }
    };

    // Message Actions
    const fetchMessages = async (channelId: EntityId) => {
        try {
            const result = await messageService.getMessages(channelId);
            if (result) messages.value = result;
        } catch (err: any) {
            // Handle 403 specifically - user doesn't have access to this channel
            if (err.response?.status === 403) {
                console.warn('Access denied to messages for channel', channelId);
                // Clear messages and redirect to server select
                messages.value = [];
                router.push({ name: 'ServerSelect' });
                addToast({
                    type: 'warning',
                    message: 'You no longer have access to this channel.',
                    duration: 5000
                });
                return;
            }
            
            // Handle other errors with generic error handling
            error.value = err.message || 'An error occurred';
            console.error('Error fetching messages:', err);
            addToast({
                type: 'danger',
                message: error.value || 'Failed to load messages',
            });
        }
    };

    const sendMessage = async (channelId: EntityId, payload: CreateMessageRequest) => {
        return await messageService.sendMessage(channelId, payload);
    };

    const updateMessage = async (channelId: EntityId, messageId: EntityId, payload: UpdateMessageRequest) => {
        await messageService.editMessage(channelId, messageId, payload);
    };

    const deleteMessage = async (channelId: EntityId, messageId: EntityId) => {
        await messageService.deleteMessage(channelId, messageId);
        messages.value = messages.value.filter(m => m.id !== messageId);
    };

    const addReaction = async (channelId: EntityId, messageId: EntityId, emoji: string) => {
        await messageService.addReaction(channelId, messageId, emoji);
    };

    const removeReaction = async (channelId: EntityId, messageId: EntityId, emoji: string) => {
        await messageService.removeReaction(channelId, messageId, emoji);
    };

    // Voice Channel Actions
    const joinVoiceChannel = async (channelId: EntityId) => {
        if (!currentServer.value) return;
        
        // 1. Set current voice channel IMMEDIATELY for UI
        currentVoiceChannelId.value = channelId;
        
        // 2. Initialize WebRTC for voice (start microphone access)
        await webrtcService.joinVoiceChannel();
        webrtcService.setMuted(selfMuted.value);
        
        // 3. Join via SignalR (this will notify ALL server members and get voice channel updates)
        try {
            await signalRService.joinVoiceChannel(currentServer.value.id, channelId);
        } catch (error) {
            console.error('❌ SignalR: Failed to join voice channel:', error);
        }
        // Persist a resumable voice session so we can auto-reconnect after refresh for a short window
        try {
            saveVoiceSession(currentServer.value.id as number, channelId as number);
        } catch {}
        // Initialize own voice state for channel
        if (currentUserId.value) {
            setUserVoiceState(channelId, currentUserId.value, { muted: selfMuted.value, deafened: selfDeafened.value });
            try { signalRService.updateVoiceState(channelId, selfMuted.value, selfDeafened.value); } catch {}
        }
        
        // 4. Connect to LiveKit immediately for video/screen sharing readiness
        try {
            // Import livekitService dynamically to avoid circular dependencies
            const livekitModule = await import('@/services/livekitService');
            const authStore = useAuthStore();
            const username = authStore.user?.username || `user_${currentUserId.value}`;
            
            await livekitModule.livekitService.connectToRoom(channelId, username);
            
        } catch (error) {
            console.error('❌ LiveKit: Failed to connect (video/screen sharing will be unavailable):', error);
        }
    };

    const leaveVoiceChannel = async (channelId: EntityId) => {
        if (!currentServer.value) return;
        
        // 1. Update UI state IMMEDIATELY
        if (currentVoiceChannelId.value === channelId) {
            currentVoiceChannelId.value = null;
            selfMuted.value = false;
            voiceChannelConnections.value.delete(channelId);
        }
        
        // 2. If we were screen sharing, stop it and notify peers first
        try {
            const livekitModule = await import('@/services/livekitService');
            if (livekitModule.livekitService.isScreenSharing()) {
                try { await livekitModule.livekitService.stopScreenShare(); } catch {}
                try { await signalRService.stopScreenShare(String(currentServer.value.id), String(channelId)); } catch {}
            }
        } catch {}

        // 3. Leave via SignalR (notify ALL server members)
        try {
            await signalRService.leaveVoiceChannel(currentServer.value.id, channelId);
            
        } catch (error) {
            console.error('❌ SignalR: Failed to leave voice channel:', error);
        }
        // User intentionally left; clear resumable session
        try { clearVoiceSession(); } catch {}
        
        // 4. Cleanup WebRTC voice connections
        webrtcService.leaveChannel();
        
        
        // 5. Disconnect from LiveKit (video/screen sharing)
        try {
            const livekitModule = await import('@/services/livekitService');
            await livekitModule.livekitService.disconnectFromRoom();
        } catch (error) {
            console.warn('⚠️ LiveKit: Failed to disconnect cleanly:', error);
        }
    };

    const toggleSelfMute = () => {
        selfMuted.value = !selfMuted.value;
        
        // Update WebRTC for voice (this will also notify SignalR)
        webrtcService.setMuted(selfMuted.value);
        
        // Update voice state map for current user in current channel
        if (currentVoiceChannelId.value && currentUserId.value) {
            const channelMap = new Map(voiceStates.value.get(currentVoiceChannelId.value) || []);
            channelMap.set(currentUserId.value, { muted: selfMuted.value, deafened: selfDeafened.value });
            const updated = new Map(voiceStates.value);
            updated.set(currentVoiceChannelId.value, channelMap);
            voiceStates.value = updated;
        }
    };

    const toggleSelfDeafen = () => {
        selfDeafened.value = !selfDeafened.value;
        
        // When deafening, also mute
        if (selfDeafened.value) {
            selfMuted.value = true;
        } else {
            // When undeafening, also unmute
            selfMuted.value = false;
        }
        
        // Update WebRTC for voice (this will also notify SignalR)
        webrtcService.setMuted(selfMuted.value);
        webrtcService.setDeafened(selfDeafened.value);
        
        // Update voice state map for current user in current channel
        if (currentVoiceChannelId.value && currentUserId.value) {
            const channelMap = new Map(voiceStates.value.get(currentVoiceChannelId.value) || []);
            channelMap.set(currentUserId.value, { muted: selfMuted.value, deafened: selfDeafened.value });
            const updated = new Map(voiceStates.value);
            updated.set(currentVoiceChannelId.value, channelMap);
            voiceStates.value = updated;
        }
    };

    const setUserVoiceState = (channelId: EntityId, userId: EntityId, state: { muted: boolean; deafened: boolean }) => {
        const channelMap = new Map(voiceStates.value.get(channelId) || []);
        channelMap.set(userId, state);
        const updated = new Map(voiceStates.value);
        updated.set(channelId, channelMap);
        voiceStates.value = updated;
    };

    const setVoiceChannelUsers = (channelId: EntityId, userIds: EntityId[]) => {
        const profiles = userIds
            .map(id => getUserProfile(id))
            .filter((p): p is UserProfileDto => p !== null);
        const updated = new Map(voiceChannelUsers.value);
        updated.set(channelId, profiles);
        voiceChannelUsers.value = updated;
    };

    const setVoiceChannelConnections = (channelId: EntityId, infos: {userId: EntityId; connectionId: string}[]) => {
        const map = new Map<EntityId, string>();
        infos.forEach(i => map.set(i.userId, i.connectionId));
        const updated = new Map(voiceChannelConnections.value);
        updated.set(channelId, map);
        voiceChannelConnections.value = updated;
    };

    const addVoiceChannelConnection = (channelId: EntityId, userId: EntityId, connectionId: string) => {
        const existing = new Map(voiceChannelConnections.value.get(channelId) || []);
        existing.set(userId, connectionId);
        const updated = new Map(voiceChannelConnections.value);
        updated.set(channelId, existing);
        voiceChannelConnections.value = updated;
    };

    const removeVoiceChannelConnection = (channelId: EntityId, userId: EntityId) => {
        const map = voiceChannelConnections.value.get(channelId);
        if (!map) return;
        map.delete(userId);
        const updated = new Map(voiceChannelConnections.value);
        if (map.size > 0) {
            updated.set(channelId, map);
        } else {
            updated.delete(channelId);
        }
        voiceChannelConnections.value = updated;
    };

    // SignalR Event Handlers
    const handleReceiveMessage = (message: MessageDto) => {
        if (currentChannel.value?.id === message.channelId) {
            messages.value.push(message);
        }
    };

    const handleMessageUpdated = (message: MessageDto) => {
        const index = messages.value.findIndex(m => m.id === message.id);
        if (index !== -1) {
            messages.value[index] = message;
        }
    };

    const handleMessageDeleted = (payload: MessageDeletedPayload) => {
        messages.value = messages.value.filter(m => m.id !== payload.messageId);
    };

    const handleReactionAdded = (payload: ReactionPayload) => {
        const message = messages.value.find(m => m.id === payload.messageId);
        if (!message) return;
        const reaction = message.reactions.find(r => r.emojiId === payload.emojiId);
        if (reaction) {
            reaction.count += 1;
            if (payload.userId === currentUserId.value) reaction.me = true;
        } else {
            message.reactions.push({
                emojiId: payload.emojiId,
                count: 1,
                me: payload.userId === currentUserId.value,
            });
        }
    };

    const handleReactionRemoved = (payload: ReactionPayload) => {
        const message = messages.value.find(m => m.id === payload.messageId);
        if (!message) return;
        const index = message.reactions.findIndex(r => r.emojiId === payload.emojiId);
        if (index === -1) return;
        const reaction = message.reactions[index];
        reaction.count -= 1;
        if (payload.userId === currentUserId.value) reaction.me = false;
        if (reaction.count <= 0) {
            message.reactions.splice(index, 1);
        }
    };

    const handleUserUpdated = (user: UserProfileDto) => {
        const authStore = useAuthStore();
        if (authStore.user?.id === user.id) {
            authStore.updateUserData(user);
        }

        const member = members.value.find(m => m.userId === user.id);
        if (member) {
            member.username = user.username;
            member.globalNickname = user.globalNickname;
            member.avatarUrl = user.avatar;
        }
    };

    const handleUserOnline = (userId: EntityId) => {
        const updated = new Set(onlineUsers.value);
        updated.add(userId);
        onlineUsers.value = updated;

        // Update member object immediately
        const member = members.value.find(m => m.userId === userId);
        if (member) {
            member.isOnline = true;
            member.status = UserStatus.Online;
        }
    };

    const handleUserOffline = (userId: EntityId) => {
        const updated = new Set(onlineUsers.value);
        updated.delete(userId);
        onlineUsers.value = updated;

        // Update member object immediately
        const member = members.value.find(m => m.userId === userId);
        if (member) {
            member.isOnline = false;
            member.status = UserStatus.Offline;
        }
    };

    const handleUserTyping = (channelId: EntityId, userId: EntityId) => {
        if (currentChannel.value?.id !== channelId) return;
        if (!typingUsers.value.has(channelId)) {
            typingUsers.value.set(channelId, new Set());
        }
        typingUsers.value.get(channelId)!.add(userId);
    };

    const handleUserStoppedTyping = (channelId: EntityId, userId: EntityId) => {
        if (currentChannel.value?.id !== channelId) return;
        const channelTypingUsers = typingUsers.value.get(channelId);
        if (channelTypingUsers) {
            channelTypingUsers.delete(userId);
            if (channelTypingUsers.size === 0) {
                typingUsers.value.delete(channelId);
            }
        }
    };

    const setTypingUsers = (channelId: EntityId, userIds: EntityId[]) => {
        if (userIds.length === 0) {
            typingUsers.value.delete(channelId);
        } else {
            typingUsers.value.set(channelId, new Set(userIds));
        }
    };

    const handleServerCreated = (server: ServerListItemDto) => {
        servers.value.push({
            id: server.id,
            name: server.name,
            icon: server.icon,
            memberCount: server.memberCount,
            isOwner: server.isOwner,
            description: server.description,
            public: server.public,
            createdAt: server.createdAt,
        });
    };

    const handleServerUpdated = (server: ServerListItemDto) => {
        const index = servers.value.findIndex(s => s.id === server.id);
        if (index !== -1) {
            servers.value[index] = {
                id: server.id,
                name: server.name,
                icon: server.icon,
                memberCount: server.memberCount,
                isOwner: server.isOwner,
                description: server.description,
                public: server.public,
                createdAt: server.createdAt,
            };
        }
        if (currentServer.value?.id === server.id) {
            fetchServer(server.id);
        }
    };

    const handleServerDeleted = (serverId: EntityId) => {
        servers.value = servers.value.filter(s => s.id !== serverId);
        if (currentServer.value?.id === serverId) {
            currentServer.value = null;
            router.push('/servers');
        }
    };

    const handleUserJoinedServer = async (payload: UserServerPayload) => {
        if (currentServer.value?.id === payload.serverId) {
            await fetchServerMembers(payload.serverId);
            if (currentServer.value) {
                currentServer.value.memberCount += 1;
            }
        }

        const serverItem = servers.value.find(s => s.id === payload.serverId);
        if (serverItem) {
            serverItem.memberCount += 1;
        }
    };

    const handleUserLeftServer = (payload: UserServerPayload) => {
        // Check if the current user is being kicked/left
        if (payload.userId === currentUserId.value) {
            // Remove server from user's server list
            servers.value = servers.value.filter(s => s.id !== payload.serverId);
            
            // If currently viewing this server, redirect to home
            if (currentServer.value?.id === payload.serverId) {
                currentServer.value = null;
                router.push('/servers');
            }
            
            // Show notification if it was a kick (with reason)
            if (payload.reason) {
                addToast({
                    type: 'warning',
                    message: `You have been removed from the server. Reason: ${payload.reason}`,
                    duration: 5000
                });
            }
            return; // Early return, no need to update member lists
        }
        
        // Handle other users leaving the server
        if (currentServer.value?.id === payload.serverId) {
            members.value = members.value.filter(m => m.userId !== payload.userId);
            if (currentServer.value && currentServer.value.memberCount > 0) {
                currentServer.value.memberCount -= 1;
            }
        }

        const serverItem = servers.value.find(s => s.id === payload.serverId);
        if (serverItem && serverItem.memberCount > 0) {
            serverItem.memberCount -= 1;
        }
    };

    const handleUserKickedFromServer = (payload: UserServerPayload) => {
        handleUserLeftServer(payload);
        if (payload.userId === currentUserId.value) {
            servers.value = servers.value.filter(s => s.id !== payload.serverId);
            if (currentServer.value?.id === payload.serverId) {
                currentServer.value = null;
                router.push('/servers');
            }
        }
    };

    const handleUserBannedFromServer = (payload: UserServerPayload) => {
        handleUserKickedFromServer(payload);
    };

    const handleChannelCreated = (channel: ChannelDetailDto) => {
        if (currentServer.value?.id === channel.serverId) {
            const item = {
                id: channel.id,
                serverId: channel.serverId,
                topicId: channel.topicId ?? undefined,
                name: channel.name,
                type: channel.type,
            };
            if (!currentServer.value.channels.some(c => c.id === channel.id)) {
                currentServer.value.channels.push(item);
            }
            const topic = currentServer.value.topics.find(t => t.id === channel.topicId);
            if (topic) {
                if (!topic.channels.some(c => c.id === channel.id)) {
                    topic.channels.push(item);
                }
            }
        }
    };

    const handleChannelUpdated = (channel: ChannelDetailDto) => {
        if (currentServer.value) {
            const index = currentServer.value.channels.findIndex(c => c.id === channel.id);
            if (index !== -1) {
                const item = {
                    id: channel.id,
                    serverId: channel.serverId,
                    topicId: channel.topicId ?? undefined,
                    name: channel.name,
                    type: channel.type,
                };
                const oldTopicId = currentServer.value.channels[index].topicId;
                currentServer.value.channels[index] = item;

                if (oldTopicId !== channel.topicId) {
                    const oldTopic = currentServer.value.topics.find(t => t.id === oldTopicId);
                    if (oldTopic) {
                        oldTopic.channels = oldTopic.channels.filter(c => c.id !== channel.id);
                    }
                    const newTopic = currentServer.value.topics.find(t => t.id === channel.topicId);
                    if (newTopic) {
                        const exist = newTopic.channels.findIndex(c => c.id === channel.id);
                        if (exist !== -1) {
                            newTopic.channels[exist] = item;
                        } else {
                            newTopic.channels.push(item);
                        }
                    }
                } else {
                    const topic = currentServer.value.topics.find(t => t.id === channel.topicId);
                    if (topic) {
                        const idx = topic.channels.findIndex(c => c.id === channel.id);
                        if (idx !== -1) topic.channels[idx] = item;
                    }
                }
            }
        }
        if (currentChannel.value?.id === channel.id) {
            currentChannel.value = channel;
        }
    };

    const handleChannelDeleted = (payload: ChannelDeletedPayload) => {
        if (currentServer.value?.id === payload.serverId) {
            currentServer.value.channels = currentServer.value.channels.filter(
                c => c.id !== payload.channelId
            );
            const topic = currentServer.value.topics.find(t => t.channels.some(c => c.id === payload.channelId));
            if (topic) {
                topic.channels = topic.channels.filter(c => c.id !== payload.channelId);
            }
        }
        if (currentChannel.value?.id === payload.channelId) {
            currentChannel.value = null;
            if (currentServer.value) {
                const firstChannel = currentServer.value.channels.find(c => c.type === 0);
                if (firstChannel) {
                    router.push(`/servers/${currentServer.value.id}/channels/${firstChannel.id}`);
                } else {
                    router.push(`/servers/${currentServer.value.id}`);
                }
            }
        }
    };

    const handleTopicCreated = (topic: TopicListItem) => {
        if (currentServer.value?.id === topic.serverId) {
            currentServer.value.topics.push(topic);
        }
    };

    const handleTopicUpdated = (topic: TopicListItem) => {
        if (!currentServer.value || currentServer.value.id !== topic.serverId) return;
        const idx = currentServer.value.topics.findIndex(t => t.id === topic.id);
        if (idx !== -1) {
            currentServer.value.topics[idx] = topic;
        } else {
            currentServer.value.topics.push(topic);
        }
        // rebuild channels list from topics
        currentServer.value.channels = currentServer.value.topics.flatMap(t => t.channels);
    };

    const handleTopicDeleted = (payload: { TopicId: EntityId; ServerId: EntityId }) => {
        if (currentServer.value?.id === payload.ServerId) {
            currentServer.value.topics = currentServer.value.topics.filter(t => t.id !== payload.TopicId);
            currentServer.value.channels = currentServer.value.channels.filter(c => c.topicId !== payload.TopicId);
        }
    };

    // Role event handlers
    const handleRoleCreated = (role: any) => {
        if (currentServer.value) {
            currentServer.value.roles.push({
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position,
                permissions: role.permissions,
                isHoisted: role.isHoisted,
                isMentionable: role.isMentionable,
            });
        }
    };

    const handleRoleUpdated = (role: any) => {
        
        if (currentServer.value) {
            const index = currentServer.value.roles.findIndex(r => r.id === role.id);
            if (index !== -1) {
                const updatedRole = {
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position,
                    permissions: role.permissions,
                    isHoisted: role.isHoisted,
                    isMentionable: role.isMentionable,
                };

                // Update server roles array (this triggers reactivity)
                currentServer.value.roles = currentServer.value.roles.map(r =>
                    r.id === role.id ? updatedRole : r
                );
                
                
                // Update the role in all members who have this role (force reactivity)
                members.value = members.value.map(member => {
                    const memberRoleIndex = member.roles.findIndex(r => r.id === role.id);
                    if (memberRoleIndex !== -1) {
                        return {
                            ...member,
                            roles: member.roles.map(r => r.id === role.id ? updatedRole : r)
                        };
                    }
                    return member;
                });
                
            }
        }
    };

    const handleRoleDeleted = (roleId: EntityId) => {
        if (currentServer.value) {
            currentServer.value.roles = currentServer.value.roles.filter(r => r.id !== roleId);
            // Remove role from members
            members.value.forEach(member => {
                member.roles = member.roles.filter(r => r.id !== roleId);
            });
        }
    };

    const handleMemberRolesUpdated = (payload: any) => {
        const memberIndex = members.value.findIndex(m => m.userId === payload.memberId);
        if (memberIndex !== -1) {
            const updatedRoles = payload.roles.map((role: any) => ({
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position,
                permissions: role.permissions,
                isHoisted: role.isHoisted,
                isMentionable: role.isMentionable,
            }));
            
            // Create a new member object to trigger reactivity
            const updatedMember = {
                ...members.value[memberIndex],
                roles: updatedRoles
            };
            
            // Update the members array with new reference to trigger reactivity
            members.value = members.value.map((member, index) =>
                index === memberIndex ? updatedMember : member
            );
            
            
        }
    };

    const handleUserJoinedVoiceChannel = (channelId: EntityId, userId: EntityId, connectionId: string) => {
        const profile = getUserProfile(userId);
        if (!profile) return;
        const users = voiceChannelUsers.value.get(channelId) || [];
        if (users.find(u => u.id === userId)) return;
        const updated = new Map(voiceChannelUsers.value);
        updated.set(channelId, [...users, profile]);
        voiceChannelUsers.value = updated;

        addVoiceChannelConnection(channelId, userId, connectionId);
    };

    const handleUserLeftVoiceChannel = (channelId: EntityId, userId: EntityId) => {
        const users = voiceChannelUsers.value.get(channelId);
        if (!users) return;
        const updatedUsers = users.filter(u => u.id !== userId);
        const updated = new Map(voiceChannelUsers.value);
        if (updatedUsers.length > 0) {
            updated.set(channelId, updatedUsers);
        } else {
            updated.delete(channelId);
        }
        voiceChannelUsers.value = updated;

        removeVoiceChannelConnection(channelId, userId);
    };

    const handleUserStartedScreenShare = (channelId: EntityId, userId: EntityId) => {
        if (!screenShares.value.has(channelId)) {
            screenShares.value.set(channelId, new Set());
        }
        screenShares.value.get(channelId)!.add(userId);
    };

    const handleUserStoppedScreenShare = (channelId: EntityId, userId: EntityId) => {
        const users = screenShares.value.get(channelId);
        if (!users) return;
        users.delete(userId);
        if (users.size === 0) {
            screenShares.value.delete(channelId);
        }
    };


    const openCreateChannelModal = (serverId: EntityId) => {
        createChannelForServerId.value = serverId;
        isCreateChannelModalOpen.value = true;
    };

    const closeCreateChannelModal = () => {
        isCreateChannelModalOpen.value = false;
        createChannelForServerId.value = null;
    };

    return {
        // State
        servers,
        currentServer,
        currentChannel,
        messages,
        members,
        onlineUsers,
        typingUsers,
        voiceChannelUsers,
        screenShares,
        loading,
        error,
        isCreateChannelModalOpen,
        createChannelForServerId,
        connectionState,

        // Computed
        currentUserId,

        // Server Actions
        fetchServers,
        fetchServer,
        fetchServerMembers,
        createServer,
        updateServer,
        deleteServer,
        leaveServer,
        generateInvite,
        joinServerWithInvite,
        joinPublicServer,

        // Channel Actions
        fetchChannel,
        updateCurrentChannelDetails,
        createChannel,
        updateChannel,
        updateTopic,
        deleteChannel,
        openCreateChannelModal,
        closeCreateChannelModal,

        // Message Actions
        fetchMessages,
        sendMessage,
        updateMessage,
        deleteMessage,
        addReaction,
        removeReaction,

        // Voice channel
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleSelfMute,
        toggleSelfDeafen,
        setVoiceChannelUsers,
        setVoiceChannelConnections,
        addVoiceChannelConnection,
        removeVoiceChannelConnection,
        currentVoiceChannelId,
        voiceChannelConnections,
        voiceStates,
        selfMuted,
        selfDeafened,

        // SignalR Event Handlers
        handleReceiveMessage,
        handleMessageUpdated,
        handleMessageDeleted,
        handleUserUpdated,
        handleUserOnline,
        handleUserOffline,
        handleUserTyping,
        handleUserStoppedTyping,
        setTypingUsers,
        setConnectionState,
        handleServerCreated,
        handleServerUpdated,
        handleServerDeleted,
        handleUserJoinedServer,
        handleUserLeftServer,
        handleUserKickedFromServer,
        handleUserBannedFromServer,
        handleChannelCreated,
        handleChannelUpdated,
        handleChannelDeleted,
        handleTopicCreated,
        handleTopicUpdated,
        handleTopicDeleted,
        handleRoleCreated,
        handleRoleUpdated,
        handleRoleDeleted,
        handleMemberRolesUpdated,
        handleReactionAdded,
        handleReactionRemoved,
        handleUserJoinedVoiceChannel,
        handleUserLeftVoiceChannel,
        handleUserStartedScreenShare,
        handleUserStoppedScreenShare,
        setUserVoiceState,

        // Reset
        $reset: () => {
            servers.value = [];
            currentServer.value = null;
            currentChannel.value = null;
            messages.value = [];
            members.value = [];
            onlineUsers.value.clear();
            typingUsers.value.clear();
            voiceChannelUsers.value.clear();
            voiceChannelConnections.value.clear();
            screenShares.value.clear();
            currentVoiceChannelId.value = null;
            selfMuted.value = false;
            error.value = null;
        },
    };
});
