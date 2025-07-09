import api from './api'
import type { Server, ServerDetails, CreateServerDto, UpdateServerDto, ServerMember, CreateInviteDto, Invite } from '@/types'

export const serverService = {
  async getServers(): Promise<Server[]> {
    const { data } = await api.get<Server[]>('/servers')
    return data
  },

  async getServer(serverId: string): Promise<ServerDetails> {
    const { data } = await api.get<ServerDetails>(`/servers/${serverId}`)
    return data
  },

  async createServer(serverData: CreateServerDto): Promise<Server> {
    const { data } = await api.post<Server>('/servers', serverData)
    return data
  },

  async updateServer(serverId: string, updates: UpdateServerDto): Promise<Server> {
    const { data } = await api.put<Server>(`/servers/${serverId}`, updates)
    return data
  },

  async deleteServer(serverId: string): Promise<void> {
    await api.delete(`/servers/${serverId}`)
  },

  async joinServer(inviteCode: string): Promise<Server> {
    const { data } = await api.post<Server>(`/servers/join/${inviteCode}`)
    return data
  },

  async leaveServer(serverId: string): Promise<void> {
    await api.post(`/servers/${serverId}/leave`)
  },

  async getServerMembers(serverId: string): Promise<ServerMember[]> {
    const { data } = await api.get<ServerMember[]>(`/servers/${serverId}/members`)
    return data
  },

  async kickMember(serverId: string, userId: string): Promise<void> {
    await api.delete(`/servers/${serverId}/members/${userId}`)
  },

  async banMember(serverId: string, userId: string, reason?: string): Promise<void> {
    await api.post(`/servers/${serverId}/bans/${userId}`, { reason })
  },

  async unbanMember(serverId: string, userId: string): Promise<void> {
    await api.delete(`/servers/${serverId}/bans/${userId}`)
  },

  async updateMemberRole(serverId: string, userId: string, roleId: string): Promise<ServerMember> {
    const { data } = await api.put<ServerMember>(`/servers/${serverId}/members/${userId}/role`, { roleId })
    return data
  },

  async createInvite(inviteData: CreateInviteDto): Promise<Invite> {
    const { data } = await api.post<Invite>('/invites', inviteData)
    return data
  },

  async getServerInvites(serverId: string): Promise<Invite[]> {
    const { data } = await api.get<Invite[]>(`/servers/${serverId}/invites`)
    return data
  },

  async revokeInvite(inviteCode: string): Promise<void> {
    await api.delete(`/invites/${inviteCode}`)
  }
}