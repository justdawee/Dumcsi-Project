import type { AxiosResponse } from 'axios';
import api from './api';
import type { UserProfile, UpdateProfilePayload, UpdatePasswordPayload } from './types';

const userService = {
  /**
   * GET /api/user/me
   */
  getProfile(): Promise<AxiosResponse<UserProfile>> {
    return api.get<UserProfile>('/user/me');
  },

  /**
   * PUT /api/user/me
   */
  updateProfile(payload: UpdateProfilePayload): Promise<AxiosResponse<void>> {
    return api.put<void>('/user/me', payload);
  },

  /**
   * POST /api/user/me/change-password
   */
  updatePassword(payload: UpdatePasswordPayload): Promise<AxiosResponse<{ message: string }>> {
    return api.post<{ message: string }>('/user/me/change-password', payload);
  },

  /**
   * DELETE /api/user/me
   */
  deleteAccount(): Promise<AxiosResponse<void>> {
    return api.delete<void>('/user/me');
  },
};
export default userService;