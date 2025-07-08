import api from './api';
import type { 
  ChannelDetailDto, 
  UpdateChannelRequestDto,
  CreateChannelRequestDto,
  ChannelListItemDto,
  ApiResponse,
  EntityId
} from './types';

const channelService = {
  async getChannel(id: EntityId): Promise<ChannelDetailDto> {
    const response = await api.get<ApiResponse<ChannelDetailDto>>(`/channels/${id}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async getChannels(): Promise<ChannelListItemDto[]> {
    const response = await api.get<ApiResponse<ChannelListItemDto[]>>('/channels');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async createChannel(payload: CreateChannelRequestDto): Promise<ChannelDetailDto> {
    const response = await api.post<ApiResponse<ChannelDetailDto>>('/channels', payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async updateChannel(id: EntityId, payload: UpdateChannelRequestDto): Promise<void> {
    const response = await api.patch<ApiResponse<void>>(`/channels/${id}`, payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
  },

  async deleteChannel(id: EntityId): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/channels/${id}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
  },
};

export default channelService;