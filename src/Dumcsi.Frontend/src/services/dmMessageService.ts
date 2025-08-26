import api from './api';
import type {
    ApiResponse,
    EntityId,
    DmMessageDto,
    SendDmMessageRequest,
    UpdateDmMessageRequest,
    ConversationListItemDto,
} from './types';

interface GetMessagesParams {
    before?: EntityId;
    limit?: number;
}

const dmMessageService = {
    async getMessages(userId: EntityId, params?: GetMessagesParams): Promise<DmMessageDto[]> {
        const response = await api.get<ApiResponse<DmMessageDto[]>>(`/dm/${userId}/messages`, { params });
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async sendMessage(userId: EntityId, payload: SendDmMessageRequest): Promise<DmMessageDto> {
        const response = await api.post<ApiResponse<DmMessageDto>>(`/dm/${userId}/messages`, payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async updateMessage(userId: EntityId, messageId: EntityId, payload: UpdateDmMessageRequest): Promise<void> {
        const response = await api.put<ApiResponse<void>>(`/dm/${userId}/messages/${messageId}`, payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async deleteMessage(userId: EntityId, messageId: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/dm/${userId}/messages/${messageId}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async getConversations(): Promise<ConversationListItemDto[]> {
        const response = await api.get<ApiResponse<ConversationListItemDto[]>>('/dm/conversations');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },
};

export default dmMessageService;