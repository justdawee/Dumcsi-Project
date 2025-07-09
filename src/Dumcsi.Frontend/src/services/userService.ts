import { api } from './api'
import type { 
  UserProfileDto, 
  UpdateUserProfileDto, 
  ChangePasswordDto 
} from '@/types'

export const userService = {
  async getProfile(): Promise<UserProfileDto> {
    return api.get<UserProfileDto>('/user/profile')
  },

  async updateProfile(data: UpdateUserProfileDto): Promise<UserProfileDto> {
    return api.put<UserProfileDto>('/user/profile', data)
  },

  async changePassword(data: ChangePasswordDto): Promise<void> {
    return api.post<void>('/user/password', data)
  },

  async uploadAvatar(file: File): Promise<UserProfileDto> {
    return api.upload<UserProfileDto>('/user/avatar', file)
  },

  async deleteAvatar(): Promise<UserProfileDto> {
    return api.delete<UserProfileDto>('/user/avatar')
  }
}