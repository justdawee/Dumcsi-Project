import type { AxiosResponse } from 'axios';
import api from './api';
import type { 
  UserProfile, 
  UpdateProfilePayload, 
  UpdatePasswordPayload,
  UserSearchResult 
} from './types';

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
   * @param payload The updated profile information including globalNickname and avatarUrl.
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

  /**
   * @description Searches for users by username or globalNickname.
   * @param query The search query string.
   * @returns A promise that resolves with an array of matching users.
   */
  searchUsers(query: string): Promise<AxiosResponse<UserSearchResult[]>> {
    return api.get<UserSearchResult[]>('/users/search', {
      params: { query }
    });
  },

  /**
   * @description Gets a user's profile by ID.
   * @param userId The ID of the user.
   * @returns A promise that resolves with the user's profile.
   */
  getUserById(userId: number): Promise<AxiosResponse<UserProfile>> {
    return api.get<UserProfile>(`/users/${userId}`);
  },

  /**
   * @description Gets online status for multiple users.
   * @param userIds Array of user IDs to check.
   * @returns A promise that resolves with online status for each user.
   */
  getUsersOnlineStatus(userIds: number[]): Promise<AxiosResponse<Record<number, boolean>>> {
    return api.post<Record<number, boolean>>('/users/online-status', { userIds });
  }
};

export default userService;