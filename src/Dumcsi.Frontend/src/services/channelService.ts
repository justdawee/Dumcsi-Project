import type { AxiosResponse } from 'axios';
import api from './api';
import type { ChannelDetail, UpdateChannelPayload } from './types';

const channelService = {
  /**
   * GET /api/channels/{id}
   */
  getChannel(id: string | number): Promise<AxiosResponse<ChannelDetail>> { // TODO: string or number is inconsistent, consider using one type
    return api.get<ChannelDetail>(`/channels/${id}`);
  },

  /**
   * PATCH /api/channels/{id}
   */
  updateChannel(id: string | number, payload: UpdateChannelPayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${id}`, payload); // TODO: need to return confirmation, currently returns void
  },

  /**
   * DELETE /api/channels/{id}
   */
  deleteChannel(id: string | number): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${id}`); // TODO: deleting into the void, we need to return confirmation
  },
};
export default channelService;