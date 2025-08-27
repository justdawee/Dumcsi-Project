import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dmMessageService from '@/services/dmMessageService';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from './auth';
import type {
    EntityId,
    ConversationListItemDto,
    DmMessageDto,
    SendDmMessageRequest,
    UpdateDmMessageRequest
} from '@/services/types';

export const useDmStore = defineStore('dm', () => {
    // State
    const conversations = ref<ConversationListItemDto[]>([]);
    const messages = ref<Map<EntityId, DmMessageDto[]>>(new Map());
    const unreadMessages = ref<Set<EntityId>>(new Set());
    const loadingConversations = ref(false);
    const loadingMessages = ref<Map<EntityId, boolean>>(new Map());
    const typingUsers = ref<Map<EntityId, boolean>>(new Map());

    const { addToast } = useToast();

    // Computed
    const sortedConversations = computed(() => {
        return [...conversations.value].sort((a, b) => {
            // Sort by last message timestamp (most recent first)
            if (!a.lastTimestamp && !b.lastTimestamp) return 0;
            if (!a.lastTimestamp) return 1;
            if (!b.lastTimestamp) return -1;

            return new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime();
        });
    });

    // Actions
    const fetchConversations = async () => {
        loadingConversations.value = true;
        try {
            const data = await dmMessageService.getConversations();
            conversations.value = data;
        } catch (error: any) {
            addToast({
                type: 'danger',
                message: 'Failed to load conversations'
            });
        } finally {
            loadingConversations.value = false;
        }
    };

    const fetchMessages = async (userId: EntityId, options?: { before?: EntityId; limit?: number }) => {
        loadingMessages.value.set(userId, true);
        try {
            const data = await dmMessageService.getMessages(userId, options);

            if (options?.before) {
                // Append older messages
                const existing = messages.value.get(userId) || [];
                messages.value.set(userId, [...data, ...existing]);
            } else {
                // Replace messages
                messages.value.set(userId, data);
            }

            // Mark as read
            unreadMessages.value.delete(userId);

            return data;
        } catch (error: any) {
            addToast({
                type: 'danger',
                message: 'Failed to load messages'
            });
            return [];
        } finally {
            loadingMessages.value.set(userId, false);
        }
    };

    const sendMessage = async (userId: EntityId, payload: SendDmMessageRequest) => {
        try {
            const message = await dmMessageService.sendMessage(userId, payload);

            // Don't add to local messages here - let SignalR handle it for consistency
            // This prevents duplicates for the sender
            
            return message;
        } catch (error: any) {
            // Handle different error types from backend
            const errorCode = error?.response?.data?.error?.code;
            const errorMessage = error?.response?.data?.error?.message;

            if (errorCode === 'DM_NOT_FRIENDS') {
                addToast({
                    type: 'warning',
                    message: 'You can only send messages to friends. Please add them back as a friend first.'
                });
            } else if (errorCode === 'DM_BLOCKED') {
                addToast({
                    type: 'warning',
                    message: 'Cannot send message to blocked user.'
                });
            } else {
                addToast({
                    type: 'danger',
                    message: errorMessage || 'Failed to send message'
                });
            }
            throw error;
        }
    };

    const updateMessage = async (userId: EntityId, messageId: EntityId, payload: UpdateDmMessageRequest) => {
        try {
            await dmMessageService.updateMessage(userId, messageId, payload);

            // Update local message
            const userMessages = messages.value.get(userId);
            if (userMessages) {
                const index = userMessages.findIndex(m => m.id === messageId);
                if (index >= 0) {
                    userMessages[index].content = payload.content;
                    userMessages[index].editedTimestamp = new Date().toISOString();
                }
            }
        } catch (error: any) {
            addToast({
                type: 'danger',
                message: 'Failed to update message'
            });
            throw error;
        }
    };

    const deleteMessage = async (userId: EntityId, messageId: EntityId) => {
        try {
            await dmMessageService.deleteMessage(userId, messageId);

            // Remove from local messages
            const userMessages = messages.value.get(userId);
            if (userMessages) {
                const index = userMessages.findIndex(m => m.id === messageId);
                if (index >= 0) {
                    userMessages.splice(index, 1);
                }
            }
        } catch (error: any) {
            addToast({
                type: 'danger',
                message: 'Failed to delete message'
            });
            throw error;
        }
    };

    const markAsUnread = (userId: EntityId) => {
        unreadMessages.value.add(userId);
    };

    const markAsRead = (userId: EntityId) => {
        unreadMessages.value.delete(userId);
    };

    const removeConversation = (userId: EntityId) => {
        conversations.value = conversations.value.filter(c => c.userId !== userId);
        messages.value.delete(userId);
        unreadMessages.value.delete(userId);
    };

    const addReceivedMessage = (message: DmMessageDto) => {
        const otherUserId = message.senderId;

        // Add to messages
        const userMessages = messages.value.get(otherUserId) || [];
        messages.value.set(otherUserId, [...userMessages, message]);

        // Update conversation
        const convIndex = conversations.value.findIndex(c => c.userId === otherUserId);
        if (convIndex >= 0) {
            conversations.value[convIndex].lastMessage = message.content;
            conversations.value[convIndex].lastTimestamp = message.timestamp;
        } else {
            conversations.value.push({
                userId: otherUserId,
                username: message.sender.username,
                lastMessage: message.content,
                lastTimestamp: message.timestamp
            });
        }

        // Mark as unread if not in that conversation
        const currentRoute = window.location.pathname;
        if (!currentRoute.includes(`/dm/${otherUserId}`)) {
            markAsUnread(otherUserId);
        }
    };

    const updateMessageFromEvent = (updatedMessage: DmMessageDto) => {
        const authStore = useAuthStore();
        const otherUserId = updatedMessage.senderId === authStore.user?.id
            ? updatedMessage.receiverId
            : updatedMessage.senderId;

        const userMessages = messages.value.get(otherUserId);
        if (userMessages) {
            const index = userMessages.findIndex(m => m.id === updatedMessage.id);
            if (index >= 0) {
                userMessages[index] = updatedMessage;
            }
        }
    };

    const deleteMessageFromEvent = (userId: EntityId, messageId: EntityId) => {
        const userMessages = messages.value.get(userId);
        if (userMessages) {
            const index = userMessages.findIndex(m => m.id === messageId);
            if (index >= 0) {
                userMessages.splice(index, 1);
            }
        }
    };

    const setUserTyping = (userId: EntityId, isTyping: boolean) => {
        if (isTyping) {
            typingUsers.value.set(userId, true);
        } else {
            typingUsers.value.delete(userId);
        }
    };

    // SignalR event handlers
    const handleReceiveMessage = (message: DmMessageDto) => {
        const authStore = useAuthStore();
        
        // Determine the other user ID for conversation purposes
        const otherUserId = message.senderId === authStore.user?.id 
            ? message.receiverId 
            : message.senderId;

        // Add to messages - SignalR now handles all message additions
        const userMessages = messages.value.get(otherUserId) || [];
        messages.value.set(otherUserId, [...userMessages, message]);

        // Update conversation
        const convIndex = conversations.value.findIndex(c => c.userId === otherUserId);
        if (convIndex >= 0) {
            conversations.value[convIndex].lastMessage = message.content;
            conversations.value[convIndex].lastTimestamp = message.timestamp;
        } else {
            // Find the sender's username
            const senderUsername = message.senderId === authStore.user?.id 
                ? authStore.user?.username || 'Unknown'
                : message.sender.username;

            conversations.value.push({
                userId: otherUserId,
                username: senderUsername,
                lastMessage: message.content,
                lastTimestamp: message.timestamp
            });
        }

        // Mark as unread if not currently viewing this conversation
        const currentRoute = window.location.pathname;
        if (!currentRoute.includes(`/dm/${otherUserId}`) && message.senderId !== authStore.user?.id) {
            markAsUnread(otherUserId);
        }
    };

    const handleMessageUpdated = (payload: { MessageId: EntityId; Content: string; EditedTimestamp?: string }) => {
        // Find the message across all conversations
        for (const [userId, userMessages] of messages.value.entries()) {
            const messageIndex = userMessages.findIndex(m => m.id === payload.MessageId);
            if (messageIndex >= 0) {
                userMessages[messageIndex].content = payload.Content;
                userMessages[messageIndex].editedTimestamp = payload.EditedTimestamp || new Date().toISOString();
                
                // Update conversation if this is the latest message
                const conv = conversations.value.find(c => c.userId === userId);
                if (conv && conv.lastTimestamp === userMessages[messageIndex].timestamp) {
                    conv.lastMessage = payload.Content;
                }
                break;
            }
        }
    };

    const handleMessageDeleted = (payload: { MessageId: EntityId }) => {
        // Find and remove the message across all conversations
        for (const [userId, userMessages] of messages.value.entries()) {
            const messageIndex = userMessages.findIndex(m => m.id === payload.MessageId);
            if (messageIndex >= 0) {
                const deletedMessage = userMessages[messageIndex];
                userMessages.splice(messageIndex, 1);
                
                // Update conversation if this was the latest message
                const conv = conversations.value.find(c => c.userId === userId);
                if (conv && conv.lastTimestamp === deletedMessage.timestamp) {
                    // Find the new last message
                    if (userMessages.length > 0) {
                        const lastMessage = userMessages[userMessages.length - 1];
                        conv.lastMessage = lastMessage.content;
                        conv.lastTimestamp = lastMessage.timestamp;
                    } else {
                        // No more messages, could remove conversation or set empty state
                        conv.lastMessage = '';
                        conv.lastTimestamp = '';
                    }
                }
                break;
            }
        }
    };

    return {
        conversations: sortedConversations,
        messages,
        unreadMessages,
        loadingConversations,
        loadingMessages,
        typingUsers,
        fetchConversations,
        fetchMessages,
        sendMessage,
        updateMessage,
        deleteMessage,
        markAsUnread,
        markAsRead,
        removeConversation,
        addReceivedMessage,
        updateMessageFromEvent,
        deleteMessageFromEvent,
        setUserTyping,
        handleReceiveMessage,
        handleMessageUpdated,
        handleMessageDeleted
    };
});