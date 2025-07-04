import type { AxiosResponse } from 'axios';
import api from './api';
import type { UserProfile, UpdateProfilePayload, UpdatePasswordPayload } from './types';

const userService = {
  /**
   * @description Fetches the profile of the currently authenticated user.
   * @returns A promise that resolves with the user's profile data.
   */

  getProfile(): Promise<AxiosResponse<UserProfile>> {
    return api.get<UserProfile>('/user/me');
  },

  /**
   * @description Updates the profile of the currently authenticated user.
   * @param payload The new username and email for the user.
   * @returns A promise that resolves with no content on success (HTTP 204).
   */

  updateProfile(payload: UpdateProfilePayload): Promise<AxiosResponse<void>> {
    return api.put<void>('/user/me', payload);
  },

  /**
   * @description Updates the password for the currently authenticated user.
   * @param payload The user's current and new passwords.
   * @returns A promise that resolves with a success message object.
   */
  
  updatePassword(payload: UpdatePasswordPayload): Promise<AxiosResponse<{ message: string }>> {
    return api.post<{ message: string }>('/user/me/change-password', payload);
  },

  /**
   * @description Deletes the account of the currently authenticated user.
   * @returns A promise that resolves with no content on success (HTTP 204).
   */

  deleteAccount(): Promise<AxiosResponse<void>> {
    return api.delete<void>('/user/me');
  },
};

export default userService;