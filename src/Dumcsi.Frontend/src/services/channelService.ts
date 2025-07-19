import api from './api';
import type {
    ChannelDetailDto,
    UpdateChannelRequest,
    ApiResponse,
    EntityId
} from './types';

const channelService = {
    /**
     * Lekéri egy csatorna részletes adatait.
     */
    async getChannel(id: EntityId): Promise<ChannelDetailDto> {
        const response = await api.get<ApiResponse<ChannelDetailDto>>(`/channels/${id}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    /**
     * Frissíti egy csatorna adatait.
     */
    async updateChannel(id: EntityId, payload: UpdateChannelRequest): Promise<void> {
        const response = await api.patch<ApiResponse<void>>(`/channels/${id}`, payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    /**
     * Törli a csatornát.
     */
    async deleteChannel(id: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/channels/${id}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },
};

export default channelService;