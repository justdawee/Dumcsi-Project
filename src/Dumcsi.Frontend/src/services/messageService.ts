import type { AxiosResponse } from 'axios';
import api from './api';
import type { MessageListItem, CreateMessagePayload, UpdateMessagePayload } from './types';

type EntityId = number;

interface GetMessagesParams {
  before?: EntityId;
  limit?: number;
}

const messageService = {
  /**
   * @description Fetches a list of messages for a given channel, with optional pagination.
   * @param channelId The ID of the channel from which to fetch messages.
   * @param params Optional parameters for pagination (e.g., `before`, `limit`).
   * @returns A promise that resolves with an array of message list items.
   */

  getMessages(channelId: EntityId, params?: GetMessagesParams): Promise<AxiosResponse<MessageListItem[]>> {
    return api.get<MessageListItem[]>(`/channels/${channelId}/messages`, { params });
  },

  /**
   * @description Sends a new message to a channel.
   * @param channelId The ID of the channel where the message will be sent.
   * @param payload The content of the new message.
   * @returns A promise that resolves with the newly created message item.
   */

  sendMessage(channelId: EntityId, payload: CreateMessagePayload): Promise<AxiosResponse<MessageListItem>> {
    return api.post<MessageListItem>(`/channels/${channelId}/messages`, payload);
  },

  /**
   * @description Edits an existing message.
   * @param channelId The ID of the channel containing the message.
   * @param messageId The ID of the message to edit.
   * @param payload The updated message content.
   * @returns A promise that resolves with no content on success (HTTP 204).
   */

  editMessage(channelId: EntityId, messageId: EntityId, payload: UpdateMessagePayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${channelId}/messages/${messageId}`, payload);
  },

  /**
   * @description Deletes a message.
   * @param channelId The ID of the channel containing the message.
   * @param messageId The ID of the message to delete.
   * @returns A promise that resolves with no content on success (HTTP 204).
   */

  deleteMessage(channelId: EntityId, messageId: EntityId): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${channelId}/messages/${messageId}`);
  },
};

export default messageService;