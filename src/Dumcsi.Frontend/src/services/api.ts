import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5230/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Ha a válasz státusza 401 (Unauthorized)
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      // A logout funkció meghívása, ami mindent elintéz
      await authStore.logout() 
      // A router.push('/auth/login') már a logout funkcióban benne van
    }
    return Promise.reject(error)
  }
)

export default api