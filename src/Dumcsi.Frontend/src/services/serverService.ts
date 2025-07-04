import type { AxiosResponse } from 'axios';
import api from './api';
import type { ServerListItem, CreateServerPayload, ServerDetail, ServerMember, ChannelListItem, CreateChannelPayload, JoinServerPayload, InviteResponse, JoinServerResponse, UpdateServerPayload } from './types';

const serverService = {
  /**
   * GET /api/server
   */
  getServers(): Promise<AxiosResponse<ServerListItem[]>> {
    return api.get<ServerListItem[]>('/server');
  },

  /**
   * POST /api/server
   */
  createServer(payload: CreateServerPayload): Promise<AxiosResponse<{ serverId: number; message: string }>> {
    return api.post('/server', payload);
  },

  /**
   * GET /api/server/{id}
   */
  getServer(id: string | number): Promise<AxiosResponse<ServerDetail>> {
    return api.get<ServerDetail>(`/server/${id}`);
  },

  /**
   * DELETE /api/server/{id}
   */
  deleteServer(id: string | number): Promise<AxiosResponse<{ message: string }>> {
    return api.delete(`/server/${id}`);
  },

  /**
   * GET /api/server/{id}/members
   */
  getServerMembers(id: string | number): Promise<AxiosResponse<ServerMember[]>> {
    return api.get<ServerMember[]>(`/server/${id}/members`);
  },

  /**
   * POST /api/server/{id}/join
   */
  joinServer(inviteCode: string): Promise<AxiosResponse<JoinServerResponse>> { // TODO: hardcoded inviteCode, consider using a more secure method
    const payload: JoinServerPayload = { inviteCode };
    return api.post<JoinServerResponse>('/server/join', payload);
  },

  /**
   * POST /api/server/{id}/leave
   */
  leaveServer(id: string | number): Promise<AxiosResponse<{ message: string }>> {
    return api.post(`/server/${id}/leave`);
  },

  /**
   * POST /api/server/{id}/invite
   */
  generateInvite(id: string | number): Promise<AxiosResponse<InviteResponse>> {
    return api.post<InviteResponse>(`/server/${id}/invite`);
  },

  /**
   * GET /api/server/{id}/channels
   */
  getServerChannels(id: string | number): Promise<AxiosResponse<ChannelListItem[]>> {
    return api.get<ChannelListItem[]>(`/server/${id}/channels`);
  },

  /**
   * POST /api/server/{id}/channels
   */
  createChannel(serverId: string | number, payload: CreateChannelPayload): Promise<AxiosResponse<ChannelListItem>> {
    return api.post<ChannelListItem>(`/server/${serverId}/channels`, payload);
  },

  /**
   * PUT /api/server/{id}
   */
  // TODO: updateserver takes a number, but others take string, also no confirmation returned
  updateServer(id: number, payload: UpdateServerPayload): Promise<AxiosResponse<void>> {
    return api.put<void>(`/server/${id}`, payload);
  },

  /**
   * GET /api/server/public
   */
  getPublicServers(): Promise<AxiosResponse<ServerListItem[]>> {
    return api.get<ServerListItem[]>('/server/public');
  },

  /**
   * POST /api/server/{id}/join
   */
  // TODO: another join method, we should probably unify these
  joinPublicServer(serverId: number): Promise<AxiosResponse<{ serverId: number; message: string }>> {
    return api.post(`/server/${serverId}/join`);
  },
};
export default serverService;