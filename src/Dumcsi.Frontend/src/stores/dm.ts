import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dmMessageService from '@/services/dmMessageService';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from './auth';
import type {
    EntityId,
    ConversationListItemDto,
    DmMessageDto
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

    const sendMessage = async (userId: EntityId, content: string) => {
        try {
            const message = await dmMessageService.sendMessage(userId, { content });

            // Add to local messages
            const userMessages = messages.value.get(userId) || [];
            messages.value.set(userId, [...userMessages, message]);

            // Update conversation list
            const convIndex = conversations.value.findIndex(c => c.userId === userId);
            if (convIndex >= 0) {
                conversations.value[convIndex].lastMessage = content;
                conversations.value[convIndex].lastTimestamp = message.timestamp;
            } else {
                // Create new conversation entry if it doesn't exist
                conversations.value.push({
                    userId,
                    username: message.sender.username,
                    lastMessage: content,
                    lastTimestamp: message.timestamp
                });
            }

            return message;
        } catch (error: any) {
            addToast({
                type: 'danger',
                message: 'Failed to send message'
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

    const updateMessage = (updatedMessage: DmMessageDto) => {
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

    const deleteMessage = (userId: EntityId, messageId: EntityId) => {
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
        markAsUnread,
        markAsRead,
        removeConversation,
        addReceivedMessage,
        updateMessage,
        deleteMessage,
        setUserTyping
    };
});