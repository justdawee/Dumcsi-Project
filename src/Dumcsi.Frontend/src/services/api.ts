import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { router } from '@/router'

const API_BASE_URL = '/api'

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
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

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const appStore = useAppStore()
        
        if (error.response?.status === 401) {
          const authStore = useAuthStore()
          authStore.logout()
          router.push('/login')
          appStore.showError('Session expired. Please login again.')
        } else if (error.response?.data?.code) {
          // Handle backend error codes
          const errorMessage = appStore.getErrorMessage(error.response.data.code)
          appStore.showError(errorMessage)
        } else if (error.message === 'Network Error') {
          appStore.showError('Network error. Please check your connection.')
        } else {
          appStore.showError('An unexpected error occurred.')
        }

        return Promise.reject(error)
      }
    )
  }

  get api() {
    return this.instance
  }
}

export default new ApiClient().api