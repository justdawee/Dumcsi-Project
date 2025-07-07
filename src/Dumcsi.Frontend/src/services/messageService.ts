import type { AxiosResponse } from 'axios';
import api from './api';
import type { MessageListItem, CreateMessagePayload, UpdateMessagePayload } from './types';

type EntityId = number;

interface GetMessagesParams {
  before?: EntityId;
  limit?: number;
}

const messageService = {

  getMessages(channelId: EntityId, params?: GetMessagesParams): Promise<AxiosResponse<MessageListItem[]>> {
    return api.get<MessageListItem[]>(`/channels/${channelId}/messages`, { params });
  },

  sendMessage(channelId: EntityId, payload: CreateMessagePayload): Promise<AxiosResponse<MessageListItem>> {
    return api.post<MessageListItem>(`/channels/${channelId}/messages`, payload);
  },

  editMessage(channelId: EntityId, messageId: EntityId, payload: UpdateMessagePayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${channelId}/messages/${messageId}`, payload);
  },

  deleteMessage(channelId: EntityId, messageId: EntityId): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${channelId}/messages/${messageId}`);
  },
};

export default messageService;