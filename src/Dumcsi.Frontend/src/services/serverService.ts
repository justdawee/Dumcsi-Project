import { api } from './api'
import type { 
  ServerListItemDto, 
  ServerDetailDto, 
  CreateServerRequestDto, 
  UpdateServerRequestDto,
  ServerMemberDto,
  EntityId,
  ChannelListItemDto,
  CreateChannelRequestDto
} from '@/types'

export const serverService = {
  async getServers(): Promise<ServerListItemDto[]> {
    return api.get<ServerListItemDto[]>('/server')
  },

  async getPublicServers(): Promise<ServerListItemDto[]> {
    return api.get<ServerListItemDto[]>('/server/public')
  },

  async getServer(id: EntityId): Promise<ServerDetailDto> {
    return api.get<ServerDetailDto>(`/server/${id}`)
  },

  async createServer(data: CreateServerRequestDto): Promise<ServerDetailDto> {
    return api.post<ServerDetailDto>('/server', data)
  },

  async updateServer(id: EntityId, data: UpdateServerRequestDto): Promise<ServerDetailDto> {
    return api.put<ServerDetailDto>(`/server/${id}`, data)
  },

  async deleteServer(id: EntityId): Promise<void> {
    return api.delete<void>(`/server/${id}`)
  },

  async joinServer(id: EntityId): Promise<void> {
    return api.post<void>(`/server/${id}/join`)
  },

  async leaveServer(id: EntityId): Promise<void> {
    return api.post<void>(`/server/${id}/leave`)
  },

  async getMembers(id: EntityId): Promise<ServerMemberDto[]> {
    return api.get<ServerMemberDto[]>(`/server/${id}/members`)
  },

  async kickMember(serverId: EntityId, memberId: EntityId): Promise<void> {
    return api.delete<void>(`/server/${serverId}/members/${memberId}`)
  },

  async banMember(serverId: EntityId, memberId: EntityId): Promise<void> {
    return api.post<void>(`/server/${serverId}/members/${memberId}/ban`)
  },

  async unbanMember(serverId: EntityId, userId: EntityId): Promise<void> {
    return api.delete<void>(`/server/${serverId}/bans/${userId}`)
  },

  async getChannels(id: EntityId): Promise<ChannelListItemDto[]> {
    return api.get<ChannelListItemDto[]>(`/server/${id}/channels`)
  },

  async createChannel(serverId: EntityId, data: CreateChannelRequestDto): Promise<ChannelListItemDto> {
    return api.post<ChannelListItemDto>(`/server/${serverId}/channels`, data)
  },

  async uploadIcon(serverId: EntityId, file: File): Promise<void> {
    return api.upload<void>(`/server/${serverId}/icon`, file)
  },

  async deleteIcon(serverId: EntityId): Promise<void> {
    return api.delete<void>(`/server/${serverId}/icon`)
  }
}