import type { AxiosResponse } from 'axios';
import api from './api';
import type { 
  ServerListItem, 
  CreateServerPayload, 
  ServerDetail, 
  ServerMember, 
  ChannelListItem, 
  CreateChannelPayload, 
  JoinServerPayload, 
  InviteResponse, 
  JoinServerResponse, 
  UpdateServerPayload 
} from './types';

type EntityId = number;

const serverService = {
  /**
   * @description Fetches the list of servers the current user is a member of.
   */
  getServers(): Promise<AxiosResponse<ServerListItem[]>> {
    return api.get<ServerListItem[]>('/server');
  },

  /**
   * @description Creates a new server.
   */
  createServer(payload: CreateServerPayload): Promise<AxiosResponse<{ serverId: number; message: string }>> {
    const apiPayload = {
      name: payload.name,
      description: payload.description,
      public: payload.isPublic,
    };
    return api.post('/server', apiPayload);
  },

  /**
   * @description Fetches detailed information for a single server.
   * @param id The unique identifier of the server.
   */
  getServer(id: EntityId): Promise<AxiosResponse<ServerDetail>> {
    return api.get<ServerDetail>(`/server/${id}`);
  },

  /**
   * @description Deletes a server. Only the owner can perform this action.
   * @param id The unique identifier of the server.
   */
  deleteServer(id: EntityId): Promise<AxiosResponse<{ message: string }>> {
    return api.delete(`/server/${id}`);
  },

  /**
   * @description Fetches the list of members for a given server.
   * @param id The unique identifier of the server.
   */
  getServerMembers(id: EntityId): Promise<AxiosResponse<ServerMember[]>> {
    return api.get<ServerMember[]>(`/server/${id}/members`);
  },
  
  /**
   * @description Leaves a server.
   * @param id The unique identifier of the server.
   */
  leaveServer(id: EntityId): Promise<AxiosResponse<{ message: string }>> {
    return api.post(`/server/${id}/leave`);
  },

  /**
   * @description Generates a new invite code for a server.
   * @param id The unique identifier of the server.
   */
  generateInvite(id: EntityId): Promise<AxiosResponse<InviteResponse>> {
    return api.post<InviteResponse>(`/server/${id}/invite`, {});
  },

  /**
   * @description Fetches the list of channels for a given server.
   * @param id The unique identifier of the server.
   */
  getServerChannels(id: EntityId): Promise<AxiosResponse<ChannelListItem[]>> {
    return api.get<ChannelListItem[]>(`/server/${id}/channels`);
  },

  /**
   * @description Creates a new channel within a server.
   * @param serverId The ID of the server where the channel will be created.
   * @param payload The data for the new channel.
   */
  createChannel(serverId: EntityId, payload: CreateChannelPayload): Promise<AxiosResponse<ChannelListItem>> {
    return api.post<ChannelListItem>(`/server/${serverId}/channels`, payload);
  },

  /**
   * @description Updates a server's settings.
   * @param id The unique identifier of the server.
   * @param payload The new settings for the server.
   */
  updateServer(id: EntityId, payload: UpdateServerPayload): Promise<AxiosResponse<void>> {
    return api.put<void>(`/server/${id}`, payload);
  },

  /**
   * @description Fetches a list of all public servers available to join.
   */
  getPublicServers(): Promise<AxiosResponse<ServerListItem[]>> {
    return api.get<ServerListItem[]>('/server/public');
  },

  /**
   * @description Joins a public server directly by its ID.
   * @param serverId The unique identifier of the public server to join.
   */
  joinPublicServer(serverId: EntityId): Promise<AxiosResponse<{ serverId: number; message: string }>> {
    return api.post(`/server/${serverId}/join`);
  },
};
export default serverService;
