import api from './api';
import type { ApiResponse, EntityId, DmSettings, DmFilterOption, DmRequestItem } from './types';

const dmService = {
    async getSettings(): Promise<DmSettings> {
        const response = await api.get<ApiResponse<DmSettings>>('/dm/settings');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async updateSettings(filter: DmFilterOption): Promise<void> {
        const response = await api.put<ApiResponse<void>>('/dm/settings', { filter });
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async getRequests(): Promise<DmRequestItem[]> {
        const response = await api.get<ApiResponse<DmRequestItem[]>>('/dm/requests');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async acceptRequest(id: EntityId): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/dm/requests/${id}/accept`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async declineRequest(id: EntityId): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/dm/requests/${id}/decline`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },
};

export default dmService;