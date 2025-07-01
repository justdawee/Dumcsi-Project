import api from './api'

export default {
  // Server operations
  getServers() {
    return api.get('/server')
  },
  
  createServer(serverData: { name: string }) {
    return api.post('/server', serverData)
  },
  
  getServer(id: string) {
    return api.get(`/server/${id}`)
  },
  
  deleteServer(id: string) {
    return api.delete(`/server/${id}`)
  },
  
  // Members
  getServerMembers(id: string) {
    return api.get(`/server/${id}/members`)
  },
  
  joinServer(id: string, inviteCode: string) {
    return api.post(`/server/${id}/join`, { inviteCode })
  },
  
  leaveServer(id: string) {
    return api.post(`/server/${id}/leave`)
  },
  
  generateInvite(id: string) {
    return api.post(`/server/${id}/invite`)
  },
  
  // Channels
  getServerChannels(id: string) {
    return api.get(`/server/${id}/channels`)
  },
  
  createChannel(serverId: string, channelData: { name: string }) {
    return api.post(`/server/${serverId}/channels`, channelData)
  },
  
  getChannel(id: string) {
    return api.get(`/channels/${id}`)
  },
  
  updateChannel(id: string, data: { name: string }) {
    return api.patch(`/channels/${id}`, data)
  },
  
  deleteChannel(id: string) {
    return api.delete(`/channels/${id}`)
  }
}