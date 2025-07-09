import { api } from './api'
import type { 
  AuditLogEntryDto,
  EntityId 
} from '@/types'

export const auditLogService = {
  async getAuditLogs(serverId: EntityId, page: number = 1, pageSize: number = 50): Promise<AuditLogEntryDto[]> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    
    return api.get<AuditLogEntryDto[]>(`/server/${serverId}/audit-logs?${params}`)
  }
}