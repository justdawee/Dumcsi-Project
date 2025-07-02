import type { AxiosResponse } from 'axios';
import api from './api';
import type { ChannelDetail, UpdateChannelPayload } from './types';

const channelService = {
  /**
   * GET /api/channels/{id}
   */
  getChannel(id: string | number): Promise<AxiosResponse<ChannelDetail>> {
    return api.get<ChannelDetail>(`/channels/${id}`);
  },

  /**
   * PATCH /api/channels/{id}
   */
  updateChannel(id: string | number, payload: UpdateChannelPayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${id}`, payload);
  },

  /**
   * DELETE /api/channels/{id}
   */
  deleteChannel(id: string | number): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${id}`);
  },
};
export default channelService;