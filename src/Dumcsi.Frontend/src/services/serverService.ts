import api from './api';
import type {
    // View Modellek
    ServerListItem,
    ServerDetails,
    ServerMember,
    ChannelListItem,
    CreateServerRequest,
    UpdateServerRequest,
    CreateChannelRequest,

    // DTO-k (nyers API válaszok)
    ServerListItemDto,
    ServerDetailDto,
    ServerMemberDto,
    ChannelListItemDto,
    RoleDto,
    CreateInviteResponse,

    // Egyéb típusok
    ApiResponse,
    EntityId,
    Role,
    InviteInfo,
    InviteInfoDto,
    CreateInviteRequest,
    JoinServerResponse,
} from './types';

import { UserStatus } from './types';

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
        isHoisted: dto.isHoisted,
        isMentionable: dto.isMentionable,
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
        createdAt: dto.createdAt,
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
        ownerUsername: dto.ownerUsername,
        currentUserPermissions: dto.currentUserPermissions,
        createdAt: dto.createdAt,
        channels: dto.channels.map(toChannelListItem),
        roles: dto.roles.map(toRole),
    };
}

function toServerMember(dto: ServerMemberDto): ServerMember {
    return {
        userId: dto.userId,
        username: dto.username,
        serverNickname: dto.serverNickname,
        globalNickname: dto.globalNickname,
        avatarUrl: dto.avatar,
        roles: dto.roles.map(toRole),
        isOnline: false, // Alapértelmezett érték, a store majd frissíti a SignalR adatok alapján
        status: UserStatus.Offline,
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
    async createServer(payload: CreateServerRequest): Promise<{ serverId: EntityId }> {
        const response = await api.post<ApiResponse<{ serverId: EntityId }>>('/server', payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    /**
     * Lekéri egy szerver részletes adatait.
     */
    async getServer(serverId: EntityId): Promise<ServerDetails> {
        const response = await api.get<ApiResponse<ServerDetailDto>>(`/server/${serverId}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return toServerDetails(response.data.data);
    },

    /**
     * Frissíti egy szerver adatait.
     */
    async updateServer(serverId: EntityId, payload: UpdateServerRequest): Promise<void> {
        const response = await api.put<ApiResponse<void>>(`/server/${serverId}`, payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    /**
     * Törli a szervert (csak tulajdonos).
     */
    async deleteServer(serverId: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/server/${serverId}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    /**
     * Kilép a szerverből.
     */
    async leaveServer(serverId: EntityId): Promise<void> {
        const response = await api.post<ApiResponse<void>>(`/server/${serverId}/leave`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    /**
     * Lekéri a szerver tagjait.
     */
    async getServerMembers(serverId: EntityId): Promise<ServerMember[]> {
        const response = await api.get<ApiResponse<ServerMemberDto[]>>(`/server/${serverId}/members`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data.map(toServerMember);
    },

    /**
     * Létrehoz egy új csatornát a szerveren.
     */
    async createChannel(serverId: EntityId, payload: CreateChannelRequest): Promise<ChannelListItem> {
        const response = await api.post<ApiResponse<ChannelListItemDto>>(
            `/server/${serverId}/channels`,
            payload,
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return toChannelListItem(response.data.data);
    },

    /**
     * Létrehoz egy meghívót a szerverhez.
     */
    async generateInvite(serverId: EntityId, payload?: CreateInviteRequest): Promise<CreateInviteResponse> {
        const response = await api.post<ApiResponse<CreateInviteResponse>>(
            `/server/${serverId}/invite`,
            payload || {}
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    /**
     * Lekéri a meghívó információit.
     */
    async getInviteInfo(inviteCode: string): Promise<InviteInfo> {
        const response = await api.get<ApiResponse<InviteInfoDto>>(`/invites/${inviteCode}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return toInviteInfo(response.data.data);
    },

    /**
     * Csatlakozás szerverhez meghívó kóddal.
     */
    async joinServer(inviteCode: string): Promise<JoinServerResponse> {
        const response = await api.post<ApiResponse<JoinServerResponse>>(`/invites/${inviteCode}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    /**
     * Csatlakozás nyilvános szerverhez.
     */
    async joinPublicServer(serverId: EntityId): Promise<JoinServerResponse> {
        const response = await api.post<ApiResponse<JoinServerResponse>>(
            `/server/${serverId}/join`
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    /**
     * Nyilvános szerverek listázása.
     */
    async getPublicServers(): Promise<ServerListItem[]> {
        const response = await api.get<ApiResponse<ServerListItemDto[]>>('/server/public');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data.map(toServerListItem);
    },
};

export default serverService;