import api from './api';
import type { ApiResponse, FriendListItem, FriendRequestItem, DmSettings, DmRequestItem, EntityId, DmFilterOption } from './types';

const friendService = {
    async getFriends(): Promise<FriendListItem[]> {
        const response = await api.get<ApiResponse<FriendListItem[]>>('/friends');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async getFriendRequests(): Promise<FriendRequestItem[]> {
        const response = await api.get<ApiResponse<FriendRequestItem[]>>('/friends/requests');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async sendFriendRequest(username: string): Promise<void> {
        const response = await api.post<ApiResponse<void>>('/friends/request', { username });
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async acceptFriendRequest(id: EntityId): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/friends/request/${id}/accept`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async declineFriendRequest(id: EntityId): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/friends/request/${id}/decline`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async removeFriend(id: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/friends/${id}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },
};

export default friendService;