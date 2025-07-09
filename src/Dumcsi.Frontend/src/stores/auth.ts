import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/authService'
import type { User, LoginDto, RegisterDto } from '@/types'
import { router } from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(credentials: LoginDto) {
    isLoading.value = true
    try {
      const response = await authService.login(credentials)
      setAuthData(response.token, response.refreshToken, response.user)
      await router.push('/')
    } finally {
      isLoading.value = false
    }
  }

  async function register(userData: RegisterDto) {
    isLoading.value = true
    try {
      const response = await authService.register(userData)
      setAuthData(response.token, response.refreshToken, response.user)
      await router.push('/')
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuthData()
      await router.push('/login')
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return
    
    try {
      user.value = await authService.getCurrentUser()
    } catch (error) {
      clearAuthData()
      throw error
    }
  }

  async function refreshAccessToken() {
    if (!refreshToken.value) {
      clearAuthData()
      throw new Error('No refresh token available')
    }

    try {
      const response = await authService.refreshToken(refreshToken.value)
      setAuthData(response.token, response.refreshToken, response.user)
    } catch (error) {
      clearAuthData()
      throw error
    }
  }

  function setAuthData(accessToken: string, refreshTkn: string, userData: User) {
    token.value = accessToken
    refreshToken.value = refreshTkn
    user.value = userData
    
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshTkn)
  }

  function clearAuthData() {
    token.value = null
    refreshToken.value = null
    user.value = null
    
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  return {
    token,
    refreshToken,
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    fetchCurrentUser,
    refreshAccessToken,
    clearAuthData
  }
})