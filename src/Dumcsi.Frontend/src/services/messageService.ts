import api from './api'

export default {
  sendMessage(channelId: string, content: string) {
    return api.post(`/channels/${channelId}/messages`, { content })
  },
  
  getMessages(channelId: string, params: any = {}) {
    return api.get(`/channels/${channelId}/messages`, { params })
  },
  
  getMessage(channelId: string, messageId: string) {
    return api.get(`/channels/${channelId}/messages/${messageId}`)
  },
  
  editMessage(channelId: string, messageId: string, content: string) {
    return api.patch(`/channels/${channelId}/messages/${messageId}`, { content })
  },
  
  deleteMessage(channelId: string, messageId: string) {
    return api.delete(`/channels/${channelId}/messages/${messageId}`)
  }
}