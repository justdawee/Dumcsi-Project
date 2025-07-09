import api from './api'
import type { Channel, CreateChannelDto, UpdateChannelDto } from '@/types'

export const channelService = {
  async getChannels(serverId: string): Promise<Channel[]> {
    const { data } = await api.get<Channel[]>(`/channels/server/${serverId}`)
    return data
  },

  async getChannel(channelId: string): Promise<Channel> {
    const { data } = await api.get<Channel>(`/channels/${channelId}`)
    return data
  },

  async createChannel(channelData: CreateChannelDto): Promise<Channel> {
    const { data } = await api.post<Channel>('/channels', channelData)
    return data
  },

  async updateChannel(channelId: string, updates: UpdateChannelDto): Promise<Channel> {
    const { data } = await api.put<Channel>(`/channels/${channelId}`, updates)
    return data
  },

  async deleteChannel(channelId: string): Promise<void> {
    await api.delete(`/channels/${channelId}`)
  },

  async reorderChannels(serverId: string, channelOrders: { channelId: string; position: number }[]): Promise<void> {
    await api.put(`/channels/server/${serverId}/reorder`, { channelOrders })
  },

  async markAsRead(channelId: string): Promise<void> {
    await api.post(`/channels/${channelId}/read`)
  }
}