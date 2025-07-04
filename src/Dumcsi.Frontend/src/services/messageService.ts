import type { AxiosResponse } from 'axios';
import api from './api';
import type { MessageListItem, CreateMessagePayload, UpdateMessagePayload } from './types';

interface GetMessagesParams {
    before?: number;
    limit?: number;
}

const messageService = {
  /**
   * GET /api/channels/{channelId}/messages
   */
  getMessages(channelId: string | number, params?: GetMessagesParams): Promise<AxiosResponse<MessageListItem[]>> {
    return api.get<MessageListItem[]>(`/channels/${channelId}/messages`, { params });
  },

  /**
   * POST /api/channels/{channelId}/messages
   */
  sendMessage(channelId: string | number, payload: CreateMessagePayload): Promise<AxiosResponse<MessageListItem>> {
    return api.post<MessageListItem>(`/channels/${channelId}/messages`, payload);
  },

  /**
   * PATCH /api/channels/{channelId}/messages/{messageId}
   */
  // TODO: use consistent types, need to return
  editMessage(channelId: string | number, messageId: string | number, payload: UpdateMessagePayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${channelId}/messages/${messageId}`, payload);
  },

  /**
   * DELETE /api/channels/{channelId}/messages/{messageId}
   */
  deleteMessage(channelId: string | number, messageId: string | number): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${channelId}/messages/${messageId}`);
  },
};
export default messageService;