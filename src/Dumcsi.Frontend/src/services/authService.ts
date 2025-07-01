import api from './api'

export default {
  login(credentials: any) {
    return api.post('/auth/login', credentials)
  },
  
  register(userData: any) {
    return api.post('/auth/register', userData)
  }
}