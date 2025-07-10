import api from './api';
import type {
  // Új, letisztult View Modellek importálása
  ServerListItem,
  ServerDetails,
  ServerMember,
  ChannelListItem,
  CreateServerRequest,
  UpdateServerRequest,
  CreateChannelRequest,
  
  // Nyers API DTO-k importálása (csak a service belső működéséhez)
  ServerListItemDto,
  ServerDetailDto,
  ServerMemberDto,
  ChannelListItemDto,
  RoleDto,

  // Egyéb szükséges típusok
  ApiResponse,
  EntityId,
  Role,
  InviteInfo,
  InviteInfoDto,
  CreateInviteRequest,
} from './types';

// =================================================================
// MAPPER FÜGGVÉNYEK
// Feladatuk a nyers API DTO-k átalakítása tiszta Frontend View Modellekké.
// =================================================================

function toRole(dto: RoleDto): Role {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color,
    position: dto.position,
    permissions: dto.permissions,
  };
}

function toChannelListItem(dto: ChannelListItemDto): ChannelListItem {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
  };
}

function toServerListItem(dto: ServerListItemDto): ServerListItem {
  return {
    id: dto.id,
    name: dto.name,
    icon: dto.icon,
    memberCount: dto.memberCount,
    isOwner: dto.isOwner,
    description: dto.description,
    public: dto.public,
  };
}

function toServerDetails(dto: ServerDetailDto): ServerDetails {
  return {
    id: dto.id,
    name: dto.name,
    icon: dto.icon,
    memberCount: dto.memberCount,
    isOwner: dto.isOwner,
    description: dto.description,
    public: dto.public,
    ownerId: dto.ownerId,
    permissions: dto.currentUserPermissions,
    channels: dto.channels.map(toChannelListItem),
    roles: dto.roles.map(toRole),
  };
}

function toServerMember(dto: ServerMemberDto): ServerMember {
  return {
    userId: dto.userId,
    username: dto.username,
    serverNickname: dto.serverNickname,
    avatarUrl: dto.avatar,
    roles: dto.roles.map(toRole),
    isOnline: false, // Alapértelmezett érték, a store majd frissíti a SignalR adatok alapján
  };
}

function toInviteInfo(dto: InviteInfoDto): InviteInfo {
  return {
    code: dto.code,
    server: {
      id: dto.server.id,
      name: dto.server.name,
      iconUrl: dto.server.icon,
      memberCount: dto.server.memberCount,
      description: dto.server.description,
    },
  };
}


// =================================================================
// REFAKTORÁLT SERVER SERVICE
// =================================================================

const serverService = {
  /**
   * Lekéri a felhasználó összes szerverét, és `ServerListItem` modellekké alakítja.
   */
  async getServers(): Promise<ServerListItem[]> {
    const response = await api.get<ApiResponse<ServerListItemDto[]>>('/server');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data.map(toServerListItem);
  },

  /**
   * Létrehoz egy új szervert.
   */
  async createServer(payload: CreateServerRequest): Promise<{ serverId: EntityId; message: string }> {
    const response = await api.post<ApiResponse<{ serverId: EntityId; message: string }>>('/server', payload);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  /**
   * Lekéri egy szerver részletes adatait, és `ServerDetails` modellé alakítja.
   */
  async getServer(id: EntityId): Promise<ServerDetails> {
    const response = await api.get<ApiResponse<ServerDetailDto>>(`/server/${id}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return toServerDetails(response.data.data);
  },

  /**
   * Töröl egy szervert.
   */
  async deleteServer(id: EntityId): Promise<{ message: string }> {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/server/${id}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  /**
   * Lekéri egy szerver tagjainak listáját, és `ServerMember` modellekké alakítja.
   */
  async getServerMembers(id: EntityId): Promise<ServerMember[]> {
    const response = await api.get<ApiResponse<ServerMemberDto[]>>(`/server/${id}/members`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data.map(toServerMember);
  },

  /**
   * Csatlakozás szerverhez meghívó kóddal.
   */
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

  /**
   * Szerver elhagyása.
   */
  async leaveServer(id: EntityId): Promise<{ message: string }> {
    const response = await api.post<ApiResponse<{ message: string }>>(`/server/${id}/leave`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },

  /**
   * Meghívó kód generálása.
   */
  async generateInvite(id: EntityId, payload?: CreateInviteRequest): Promise<{ code: string; message: string }> {
    const response = await api.post<ApiResponse<{ code: string; message: string }>>(
      `/server/${id}/invite`, 
      payload || {}
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data; 
  },

  /**
   * Meghívó információinak lekérése.
   */
  async getInviteInfo(code: string): Promise<InviteInfo> {
    const response = await api.get<ApiResponse<InviteInfoDto>>(`/invite/${code}`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return toInviteInfo(response.data.data);
  },

  /**
   * Szerver csatornáinak lekérése.
   */
  async getServerChannels(id: EntityId): Promise<ChannelListItem[]> {
    const response = await api.get<ApiResponse<ChannelListItemDto[]>>(`/server/${id}/channels`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data.map(toChannelListItem);
  },

  /**
   * Új csatorna létrehozása egy szerveren.
   */
  async createChannel(serverId: EntityId, payload: CreateChannelRequest): Promise<ChannelListItem> {
    const response = await api.post<ApiResponse<ChannelListItemDto>>(
      `/server/${serverId}/channels`, 
      payload
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return toChannelListItem(response.data.data);
  },

  /**
   * Szerver adatainak frissítése.
   */
  async updateServer(id: EntityId, payload: UpdateServerRequest): Promise<void> {
    const response = await api.put<ApiResponse<void>>(`/server/${id}`, payload);
    console.log('Update server response:', response.data);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
  },

  /**
   * Nyilvános szerverek listájának lekérése.
   */
  async getPublicServers(): Promise<ServerListItem[]> {
    const response = await api.get<ApiResponse<ServerListItemDto[]>>('/server/public');
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data.map(toServerListItem);
  },

  /**
   * Csatlakozás nyilvános szerverhez.
   */
  async joinPublicServer(serverId: EntityId): Promise<{ serverId: EntityId; message: string }> {
    const response = await api.post<ApiResponse<{ serverId: EntityId; message: string }>>(`/server/${serverId}/join`);
    if (!response.data.isSuccess) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },
};

export default serverService;
