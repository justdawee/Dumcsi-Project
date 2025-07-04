import type { AxiosResponse } from 'axios';
import api from './api';
import type { ChannelDetail, UpdateChannelPayload } from './types';

// Type alias for a unique identifier for entities, such as channels.
type EntityId = number;

const channelService = {
  /**
   * @description Fetches the details of a specific channel.
   * @param id The unique identifier of the channel.
   * @returns A promise that resolves with the channel's detailed information.
   */

  getChannel(id: EntityId): Promise<AxiosResponse<ChannelDetail>> {
    return api.get<ChannelDetail>(`/channels/${id}`);
  },

  /**
   * @description Updates a channel's information.
   * @param id The unique identifier of the channel to update.
   * @param payload The new data for the channel.
   * @returns A promise that resolves with no content on success (HTTP 204).
   */

  updateChannel(id: EntityId, payload: UpdateChannelPayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${id}`, payload);
  },

  /**
   * @description Deletes a channel.
   * @param id The unique identifier of the channel to delete.
   * @returns A promise that resolves with no content on success (HTTP 204).
   */

  deleteChannel(id: EntityId): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${id}`);
  },
};

export default channelService;