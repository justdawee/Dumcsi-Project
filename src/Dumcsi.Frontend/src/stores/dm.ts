import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import dmMessageService from '@/services/dmMessageService';
import { useToast } from '@/composables/useToast';
import type { EntityId, DmMessageDto, ConversationListItemDto } from '@/services/types';

export const useDmStore = defineStore('dm', () => {
    const conversations = ref<ConversationListItemDto[]>([]);
    const messages = reactive<Map<EntityId, DmMessageDto[]>>(new Map());
    const loading = ref(false);
    const { addToast } = useToast();

    const fetchConversations = async () => {
        try {
            conversations.value = await dmMessageService.getConversations();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        }
    };

    const fetchMessages = async (userId: EntityId) => {
        loading.value = true;
        try {
            const msgs = await dmMessageService.getMessages(userId);
            messages.set(userId, msgs);
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
        } finally {
            loading.value = false;
        }
    };

    const sendMessage = async (userId: EntityId, content: string) => {
        try {
            const msg = await dmMessageService.sendMessage(userId, { content });
            if (!messages.has(userId)) messages.set(userId, []);
            messages.get(userId)!.push(msg);
            await fetchConversations();
        } catch (err: any) {
            addToast({ type: 'danger', message: err.message });
            throw err;
        }
    };

    return {
        conversations,
        messages,
        loading,
        fetchConversations,
        fetchMessages,
        sendMessage,
    };
});