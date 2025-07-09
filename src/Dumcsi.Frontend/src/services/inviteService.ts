import { api } from './api'
import type { 
  InviteInfoDto, 
  CreateInviteRequestDto,
  EntityId 
} from '@/types'

export const inviteService = {
  async getInviteInfo(inviteCode: string): Promise<InviteInfoDto> {
    return api.get<InviteInfoDto>(`/invite/${inviteCode}`)
  },

  async createInvite(serverId: EntityId, data: CreateInviteRequestDto): Promise<{ code: string }> {
    return api.post<{ code: string }>(`/server/${serverId}/invites`, data)
  },

  async useInvite(inviteCode: string): Promise<void> {
    return api.post<void>(`/invite/${inviteCode}/use`)
  },

  async deleteInvite(serverId: EntityId, inviteCode: string): Promise<void> {
    return api.delete<void>(`/server/${serverId}/invites/${inviteCode}`)
  }
}