import { api } from './api'
import type { 
  RoleDto, 
  CreateRoleRequestDto, 
  UpdateRoleRequestDto,
  UpdateMemberRolesRequestDto,
  EntityId 
} from '@/types'

export const roleService = {
  async getRoles(serverId: EntityId): Promise<RoleDto[]> {
    return api.get<RoleDto[]>(`/server/${serverId}/roles`)
  },

  async createRole(serverId: EntityId, data: CreateRoleRequestDto): Promise<RoleDto> {
    return api.post<RoleDto>(`/server/${serverId}/roles`, data)
  },

  async updateRole(serverId: EntityId, roleId: EntityId, data: UpdateRoleRequestDto): Promise<RoleDto> {
    return api.put<RoleDto>(`/server/${serverId}/roles/${roleId}`, data)
  },

  async deleteRole(serverId: EntityId, roleId: EntityId): Promise<void> {
    return api.delete<void>(`/server/${serverId}/roles/${roleId}`)
  },

  async updateMemberRoles(serverId: EntityId, memberId: EntityId, data: UpdateMemberRolesRequestDto): Promise<void> {
    return api.put<void>(`/server/${serverId}/members/${memberId}/roles`, data)
  }
}