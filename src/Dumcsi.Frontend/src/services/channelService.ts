import api from './api'
import type { Channel, CreateChannelDto, UpdateChannelDto } from '@/types'

export const channelService = {
  async getChannels(serverId: string): Promise<Channel[]> {
    const { data } = await api.get<{ data: Channel[] }>(`/server/${serverId}/channels`)
    return data.data
  },

  async getChannel(channelId: string): Promise<Channel> {
    const { data } = await api.get<{ data: Channel }>(`/channels/${channelId}`)
    return data.data
  },

  async createChannel(channelData: CreateChannelDto): Promise<Channel> {
    const { data } = await api.post<{ data: Channel }>('/channels', channelData)
    return data.data
  },

  async updateChannel(channelId: string, updates: UpdateChannelDto): Promise<Channel> {
    const { data } = await api.put<{ data: Channel }>(`/channels/${channelId}`, updates)
    return data.data
  },

  async deleteChannel(channelId: string): Promise<void> {
    await api.delete(`/channels/${channelId}`)
  },

  async reorderChannels(serverId: string, channelOrders: { channelId: string; position: number }[]): Promise<void> {
    await api.put(`/server/${serverId}/channels/reorder`, { channelOrders })
  },

  async markAsRead(channelId: string): Promise<void> {
    await api.post(`/channels/${channelId}/read`)
  }
}