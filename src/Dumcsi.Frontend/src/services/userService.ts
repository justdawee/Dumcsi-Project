import api from './api';
import type { 
  UserProfileDto, 
  UpdateUserProfileDto, 
  ChangePasswordDto,
  ApiResponse,
  EntityId
} from './types';

const userService = {
  async getProfile(): Promise<UserProfileDto> {
    const response = await api.get<ApiResponse<UserProfileDto>>('/user/me');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async updateProfile(payload: UpdateUserProfileDto): Promise<UserProfileDto> {
    const response = await api.put<ApiResponse<UserProfileDto>>('/user/me', payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async changePassword(payload: ChangePasswordDto): Promise<void> {
    const response = await api.post<ApiResponse<void>>('/user/me/change-password', payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
  },

  async deleteAccount(): Promise<void> {
    const response = await api.delete<ApiResponse<void>>('/user/me');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
  },

  async searchUsers(query: string): Promise<UserProfileDto[]> {
    const response = await api.get<ApiResponse<UserProfileDto[]>>('/user/search', {
      params: { query }
    });
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async getUser(userId: EntityId): Promise<UserProfileDto> {
    const response = await api.get<ApiResponse<UserProfileDto>>(`/user/${userId}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },
};

export default userService;