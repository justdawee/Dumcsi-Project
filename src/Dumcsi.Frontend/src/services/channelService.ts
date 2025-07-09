import { api } from './api'
import type { 
  ChannelDetailDto, 
  UpdateChannelRequestDto,
  EntityId 
} from '@/types'

export const channelService = {
  async getChannel(id: EntityId): Promise<ChannelDetailDto> {
    return api.get<ChannelDetailDto>(`/channels/${id}`)
  },

  async updateChannel(id: EntityId, data: UpdateChannelRequestDto): Promise<ChannelDetailDto> {
    return api.put<ChannelDetailDto>(`/channels/${id}`, data)
  },

  async deleteChannel(id: EntityId): Promise<void> {
    return api.delete<void>(`/channels/${id}`)
  }
}