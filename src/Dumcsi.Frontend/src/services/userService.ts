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
            params: {query}
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

    async revokeAllSessions(): Promise<void> {
        const response = await api.post<ApiResponse<void>>('/user/me/revoke-sessions');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async getSessions(): Promise<Array<{ id: number; fingerprint: string; createdAt: string; expiresAt: string }>> {
        const response = await api.get<ApiResponse<any[]>>('/user/me/sessions');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        // Be resilient to naming (camelCase vs PascalCase)
        return (response.data.data || []).map((s: any) => ({
            id: s.id ?? s.Id,
            fingerprint: s.fingerprint ?? s.Fingerprint ?? '',
            createdAt: s.createdAt ?? s.CreatedAt,
            expiresAt: s.expiresAt ?? s.ExpiresAt,
        }));
    },

    async revokeSession(id: number): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/user/me/sessions/${id}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },
};

export default userService;
