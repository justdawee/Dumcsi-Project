import { api } from './api'
import type { 
  MessageDto, 
  CreateMessageRequestDto, 
  UpdateMessageRequestDto,
  AttachmentDto,
  EntityId 
} from '@/types'

export const messageService = {
  async getMessages(channelId: EntityId, before?: EntityId, limit: number = 50): Promise<MessageDto[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (before) params.append('before', before.toString())
    
    return api.get<MessageDto[]>(`/channels/${channelId}/messages?${params}`)
  },

  async sendMessage(channelId: EntityId, data: CreateMessageRequestDto): Promise<MessageDto> {
    return api.post<MessageDto>(`/channels/${channelId}/messages`, data)
  },

  async updateMessage(channelId: EntityId, messageId: EntityId, data: UpdateMessageRequestDto): Promise<MessageDto> {
    return api.put<MessageDto>(`/channels/${channelId}/messages/${messageId}`, data)
  },

  async deleteMessage(channelId: EntityId, messageId: EntityId): Promise<void> {
    return api.delete<void>(`/channels/${channelId}/messages/${messageId}`)
  },

  async uploadAttachment(channelId: EntityId, file: File): Promise<AttachmentDto> {
    return api.upload<AttachmentDto>(`/channels/${channelId}/attachments`, file)
  },

  async addReaction(channelId: EntityId, messageId: EntityId, emojiId: string): Promise<void> {
    return api.post<void>(`/channels/${channelId}/messages/${messageId}/reactions/${emojiId}`)
  },

  async removeReaction(channelId: EntityId, messageId: EntityId, emojiId: string): Promise<void> {
    return api.delete<void>(`/channels/${channelId}/messages/${messageId}/reactions/${emojiId}`)
  }
}