import api from './api'
import type { User, UpdateProfileDto, DirectMessage } from '@/types'

export const userService = {
  async getUser(userId: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${userId}`)
    return data
  },

  async updateProfile(updates: UpdateProfileDto): Promise<User> {
    const { data } = await api.put<User>('/users/profile', updates)
    return data
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/users/password', { currentPassword, newPassword })
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete('/users/account', { data: { password } })
  },

  async searchUsers(query: string): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/search', { params: { q: query } })
    return data
  },

  async blockUser(userId: string): Promise<void> {
    await api.post(`/users/${userId}/block`)
  },

  async unblockUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/block`)
  },

  async getBlockedUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/blocked')
    return data
  },

  async getDirectMessages(): Promise<DirectMessage[]> {
    const { data } = await api.get<DirectMessage[]>('/users/direct-messages')
    return data
  },

  async createDirectMessage(userId: string): Promise<DirectMessage> {
    const { data } = await api.post<DirectMessage>(`/users/${userId}/direct-message`)
    return data
  }
}