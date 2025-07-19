import api from './api';
import type {
    MessageDto,
    CreateMessageRequest,
    UpdateMessageRequest,
    ApiResponse,
    EntityId
} from './types';

interface GetMessagesParams {
    before?: EntityId;
    limit?: number;
}

const messageService = {
    async getMessages(channelId: EntityId, params?: GetMessagesParams): Promise<MessageDto[]> {
        const response = await api.get<ApiResponse<MessageDto[]>>(
            `/channels/${channelId}/messages`,
            {params}
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async sendMessage(channelId: EntityId, payload: CreateMessageRequest): Promise<MessageDto> {
        const response = await api.post<ApiResponse<MessageDto>>(
            `/channels/${channelId}/messages`,
            payload
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async editMessage(channelId: EntityId, messageId: EntityId, payload: UpdateMessageRequest): Promise<void> {
        const response = await api.patch<ApiResponse<void>>(
            `/channels/${channelId}/messages/${messageId}`,
            payload
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async deleteMessage(channelId: EntityId, messageId: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(
            `/channels/${channelId}/messages/${messageId}`
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async addReaction(channelId: EntityId, messageId: EntityId, emoji: string): Promise<void> {
        const encoded = encodeURIComponent(emoji);
        const response = await api.put<ApiResponse<void>>(
            `/channels/${channelId}/messages/${messageId}/reactions/${encoded}`
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async removeReaction(channelId: EntityId, messageId: EntityId, emoji: string): Promise<void> {
        const encoded = encodeURIComponent(emoji);
        const response = await api.delete<ApiResponse<void>>(
            `/channels/${channelId}/messages/${messageId}/reactions/${encoded}`
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },
};

export default messageService;