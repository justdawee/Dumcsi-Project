import api from './api';
import type { 
  ServerListItemDto, 
  CreateServerRequestDto, 
  ServerDetailDto, 
  ServerMemberDto, 
  ChannelListItemDto, 
  CreateChannelRequestDto, 
  UpdateServerRequestDto,
  InviteInfoDto,
  CreateInviteRequestDto,
  ApiResponse,
  EntityId
} from './types';

const serverService = {
  async getServers(): Promise<ServerListItemDto[]> {
    const response = await api.get<ApiResponse<ServerListItemDto[]>>('/server');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async createServer(payload: CreateServerRequestDto): Promise<{ serverId: EntityId; message: string }> {
    const response = await api.post<ApiResponse<{ serverId: EntityId; message: string }>>('/server', payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async getServer(id: EntityId): Promise<ServerDetailDto> {
    const response = await api.get<ApiResponse<ServerDetailDto>>(`/server/${id}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async deleteServer(id: EntityId): Promise<{ message: string }> {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/server/${id}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async getServerMembers(id: EntityId): Promise<ServerMemberDto[]> {
    const response = await api.get<ApiResponse<ServerMemberDto[]>>(`/server/${id}/members`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async joinServer(inviteCode: string): Promise<{ serverId: EntityId; serverName: string; message: string }> {
    const response = await api.post<ApiResponse<{ serverId: EntityId; serverName: string; message: string }>>(
      '/server/join', 
      { inviteCode }
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async leaveServer(id: EntityId): Promise<{ message: string }> {
    const response = await api.post<ApiResponse<{ message: string }>>(`/server/${id}/leave`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async generateInvite(id: EntityId, payload?: CreateInviteRequestDto): Promise<{ inviteCode: string; message: string }> {
    const response = await api.post<ApiResponse<{ inviteCode: string; message: string }>>(
      `/server/${id}/invite`, 
      payload || {}
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async getInviteInfo(inviteCode: string): Promise<InviteInfoDto> {
    const response = await api.get<ApiResponse<InviteInfoDto>>(`/invite/${inviteCode}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async getServerChannels(id: EntityId): Promise<ChannelListItemDto[]> {
    const response = await api.get<ApiResponse<ChannelListItemDto[]>>(`/server/${id}/channels`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async createChannel(serverId: EntityId, payload: CreateChannelRequestDto): Promise<ChannelListItemDto> {
    const response = await api.post<ApiResponse<ChannelListItemDto>>(
      `/server/${serverId}/channels`, 
      payload
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async updateServer(id: EntityId, payload: UpdateServerRequestDto): Promise<void> {
    const response = await api.put<ApiResponse<void>>(`/server/${id}`, payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
  },

  async getPublicServers(): Promise<ServerListItemDto[]> {
    const response = await api.get<ApiResponse<ServerListItemDto[]>>('/server/public');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  async joinPublicServer(serverId: EntityId): Promise<{ serverId: EntityId; message: string }> {
    const response = await api.post<ApiResponse<{ serverId: EntityId; message: string }>>(`/server/${serverId}/join`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },
};

export default serverService;