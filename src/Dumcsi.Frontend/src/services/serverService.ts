import api from './api'
import type { Server, ServerDetails, CreateServerDto, UpdateServerDto, ServerMember, CreateInviteDto } from '@/types'

export const serverService = {
  async getServers(): Promise<Server[]> {
    const { data } = await api.get<{ data: Server[] }>('/server')
    return data.data
  },

  async getServer(serverId: string): Promise<ServerDetails> {
    const { data } = await api.get<{ data: ServerDetails }>(`/server/${serverId}`)
    return data.data
  },

  async createServer(serverData: CreateServerDto): Promise<Server> {
    const { data } = await api.post<{ data: Server }>('/server', serverData)
    return data.data
  },

  async updateServer(serverId: string, updates: UpdateServerDto): Promise<Server> {
    const { data } = await api.put<{ data: Server }>(`/server/${serverId}`, updates)
    return data.data
  },

  async deleteServer(serverId: string): Promise<void> {
    await api.delete(`/server/${serverId}`)
  },

  async joinServer(inviteCode: string): Promise<{ serverId: number; serverName: string }> {
    const { data } = await api.post<{ data: { serverId: number; serverName: string } }>(`/invites/${inviteCode}`)
    return data.data
  },

  async leaveServer(serverId: string): Promise<void> {
    await api.post(`/server/${serverId}/leave`)
  },

  async getServerMembers(serverId: string): Promise<ServerMember[]> {
    const { data } = await api.get<{ data: ServerMember[] }>(`/server/${serverId}/members`)
    return data.data
  },

  async kickMember(serverId: string, userId: string): Promise<void> {
    await api.delete(`/server/${serverId}/members/${userId}`)
  },

  async banMember(serverId: string, userId: string, reason?: string): Promise<void> {
    await api.post(`/server/${serverId}/members/${userId}/ban`, { reason })
  },

  async unbanMember(serverId: string, userId: string): Promise<void> {
    await api.delete(`/server/${serverId}/bans/${userId}`)
  },

  async updateMemberRoles(serverId: string, userId: string, roleIds: string[]): Promise<void> {
    await api.put(`/server/${serverId}/members/${userId}/roles`, { roleIds })
  },

  async createInvite(inviteData: CreateInviteDto): Promise<{ code: string }> {
    const { data } = await api.post<{ data: { code: string } }>(`/server/${inviteData.serverId}/invite`, {
      expiresInHours: inviteData.expiresInHours,
      maxUses: inviteData.maxUses,
      //isTemporary: inviteData.isTemporary
    })
    return data.data
  },

  async getServerInvites(serverId: string): Promise<any[]> {
    const { data } = await api.get<{ data: any[] }>(`/server/${serverId}/invites`)
    return data.data
  },

  async revokeInvite(serverId: string, inviteCode: string): Promise<void> {
    await api.delete(`/server/${serverId}/invite/${inviteCode}`)
  },

  async uploadServerIcon(serverId: string, file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    await api.post(`/server/${serverId}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  async deleteServerIcon(serverId: string): Promise<void> {
    await api.delete(`/server/${serverId}/icon`)
  }
}