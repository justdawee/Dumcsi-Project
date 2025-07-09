import api from './api'
import type { Message, CreateMessageDto, UpdateMessageDto, PaginatedResponse, PaginationParams } from '@/types'

export const messageService = {
  async getMessages(channelId: string, params?: PaginationParams): Promise<PaginatedResponse<Message>> {
    const { data } = await api.get<PaginatedResponse<Message>>(`/messages/channel/${channelId}`, { params })
    return data
  },

  async getMessage(messageId: string): Promise<Message> {
    const { data } = await api.get<Message>(`/messages/${messageId}`)
    return data
  },

  async sendMessage(channelId: string, messageData: CreateMessageDto): Promise<Message> {
    const { data } = await api.post<Message>(`/messages/channel/${channelId}`, messageData)
    return data
  },

  async updateMessage(messageId: string, updates: UpdateMessageDto): Promise<Message> {
    const { data } = await api.put<Message>(`/messages/${messageId}`, updates)
    return data
  },

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`)
  },

  async pinMessage(messageId: string): Promise<void> {
    await api.post(`/messages/${messageId}/pin`)
  },

  async unpinMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}/pin`)
  },

  async getPinnedMessages(channelId: string): Promise<Message[]> {
    const { data } = await api.get<Message[]>(`/messages/channel/${channelId}/pinned`)
    return data
  },

  async searchMessages(serverId: string, query: string, params?: PaginationParams): Promise<PaginatedResponse<Message>> {
    const { data } = await api.get<PaginatedResponse<Message>>(`/messages/server/${serverId}/search`, { 
      params: { ...params, q: query }
    })
    return data
  }
}