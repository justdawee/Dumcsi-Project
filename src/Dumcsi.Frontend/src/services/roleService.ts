import api from './api';
import type {
    ApiResponse,
    EntityId,
    Role,
    RoleDto,
    Permission,
} from './types';

// Role creation request type
export interface CreateRoleRequest {
    name: string;
    color?: string;
    permissions?: Permission;
    isHoisted?: boolean;
    isMentionable?: boolean;
}

// Role update request type
export interface UpdateRoleRequest {
    name?: string;
    color?: string;
    permissions?: Permission;
    position?: number;
    isHoisted?: boolean;
    isMentionable?: boolean;
}

// Update member roles request type
export interface UpdateMemberRolesRequest {
    roleIds: EntityId[];
}

// Mapper function
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

const roleService = {
    /**
     * Get all roles for a server
     */
    async getRoles(serverId: EntityId): Promise<Role[]> {
        const response = await api.get<ApiResponse<RoleDto[]>>(`/server/${serverId}/roles`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data.map(toRole);
    },

    /**
     * Create a new role
     */
    async createRole(serverId: EntityId, request: CreateRoleRequest): Promise<Role> {
        const response = await api.post<ApiResponse<RoleDto>>(`/server/${serverId}/roles`, request);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return toRole(response.data.data);
    },

    /**
     * Update an existing role
     */
    async updateRole(serverId: EntityId, roleId: EntityId, request: UpdateRoleRequest): Promise<Role> {
        const response = await api.patch<ApiResponse<RoleDto>>(`/server/${serverId}/roles/${roleId}`, request);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return toRole(response.data.data);
    },

    /**
     * Delete a role
     */
    async deleteRole(serverId: EntityId, roleId: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/server/${serverId}/roles/${roleId}`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    /**
     * Update member roles
     */
    async updateMemberRoles(serverId: EntityId, memberId: EntityId, roleIds: EntityId[]): Promise<void> {
        const response = await api.put<ApiResponse<void>>(
            `/server/${serverId}/roles/members/${memberId}/roles`,
            { roleIds }
        );
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },
};

export default roleService;