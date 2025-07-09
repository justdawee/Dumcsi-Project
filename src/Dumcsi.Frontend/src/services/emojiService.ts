import { api } from './api'
import type { 
  EmojiDto, 
  CreateEmojiRequestDto, 
  UpdateEmojiRequestDto,
  EntityId 
} from '@/types'

export const emojiService = {
  async getEmojis(serverId: EntityId): Promise<EmojiDto[]> {
    return api.get<EmojiDto[]>(`/server/${serverId}/emojis`)
  },

  async createEmoji(serverId: EntityId, data: CreateEmojiRequestDto): Promise<EmojiDto> {
    return api.post<EmojiDto>(`/server/${serverId}/emojis`, data)
  },

  async updateEmoji(serverId: EntityId, emojiId: EntityId, data: UpdateEmojiRequestDto): Promise<EmojiDto> {
    return api.put<EmojiDto>(`/server/${serverId}/emojis/${emojiId}`, data)
  },

  async deleteEmoji(serverId: EntityId, emojiId: EntityId): Promise<void> {
    return api.delete<void>(`/server/${serverId}/emojis/${emojiId}`)
  }
}