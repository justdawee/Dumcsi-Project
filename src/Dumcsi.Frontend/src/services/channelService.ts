import type { AxiosResponse } from 'axios';
import api from './api';
import type { ChannelDetail, CreateChannelPayload, UpdateChannelPayload } from './types';

type EntityId = number;

const channelService = {

  getChannel(id: EntityId): Promise<AxiosResponse<ChannelDetail>> {
    return api.get<ChannelDetail>(`/channels/${id}`);
  },

  createChannel(serverId: EntityId, payload: CreateChannelPayload): Promise<AxiosResponse<ChannelDetail>> {
    return api.post<ChannelDetail>(`/server/${serverId}/channels`, payload);
  },

  updateChannel(id: EntityId, payload: UpdateChannelPayload): Promise<AxiosResponse<void>> {
    return api.patch<void>(`/channels/${id}`, payload);
  },

  deleteChannel(id: EntityId): Promise<AxiosResponse<void>> {
    return api.delete<void>(`/channels/${id}`);
  },
};

export default channelService;
