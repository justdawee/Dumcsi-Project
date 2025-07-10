import api from './api';
import type { 
  MessageDto, 
  CreateMessageRequestDto, 
  UpdateMessageRequestDto,
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
      { params }
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async sendMessage(channelId: EntityId, payload: CreateMessageRequestDto): Promise<MessageDto> {
    const response = await api.post<ApiResponse<MessageDto>>(
      `/channels/${channelId}/messages`, 
      payload
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async editMessage(channelId: EntityId, messageId: EntityId, payload: UpdateMessageRequestDto): Promise<void> {
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
};

export default messageService;