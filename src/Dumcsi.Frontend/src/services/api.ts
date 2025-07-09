import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/router'

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      await authStore.logout()
      if (router.currentRoute.value.name !== 'login') {
        router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

// Helper function to handle API responses
export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (!response.data.isSuccess) {
    throw new Error(response.data.message || 'API request failed')
  }
  return response.data.data
}

// Generic API functions
export const api = {
  get: async <T>(url: string): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url)
    return handleApiResponse(response)
  },
  
  post: async <T>(url: string, data?: any): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(url, data)
    return handleApiResponse(response)
  },
  
  put: async <T>(url: string, data?: any): Promise<T> => {
    const response = await apiClient.put<ApiResponse<T>>(url, data)
    return handleApiResponse(response)
  },
  
  delete: async <T>(url: string): Promise<T> => {
    const response = await apiClient.delete<ApiResponse<T>>(url)
    return handleApiResponse(response)
  },
  
  upload: async <T>(url: string, file: File): Promise<T> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return handleApiResponse(response)
  }
}