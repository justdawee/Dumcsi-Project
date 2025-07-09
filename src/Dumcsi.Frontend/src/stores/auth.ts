import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { handleError } from '@/services/errorHandler'
import { signalRService } from '@/services/signalrService'
import type { 
  UserProfileDto, 
  LoginRequestDto, 
  RegisterRequestDto, 
  UpdateUserProfileDto, 
  ChangePasswordDto,
  JwtPayload 
} from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<UserProfileDto | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const currentUser = computed(() => user.value)

  // JWT decode helper
  const decodeJwt = (token: string): JwtPayload | null => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''))
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  // Token validation
  const isTokenValid = (token: string): boolean => {
    const payload = decodeJwt(token)
    if (!payload) return false
    return payload.exp * 1000 > Date.now()
  }

  // Actions
  const setAuth = (accessToken: string, refreshTokenValue: string) => {
    token.value = accessToken
    refreshToken.value = refreshTokenValue
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshTokenValue)
  }

  const clearAuth = () => {
    user.value = null
    token.value = null
    refreshToken.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  const login = async (credentials: LoginRequestDto): Promise<void> => {
    try {
      loading.value = true
      const response = await authService.login(credentials)
      
      setAuth(response.accessToken, response.refreshToken)
      await loadProfile()
      await signalRService.initialize()
    } catch (error) {
      throw new Error(handleError(error, 'Login failed'))
    } finally {
      loading.value = false
    }
  }

  const register = async (userData: RegisterRequestDto): Promise<void> => {
    try {
      loading.value = true
      const response = await authService.register(userData)
      
      setAuth(response.accessToken, response.refreshToken)
      await loadProfile()
      await signalRService.initialize()
    } catch (error) {
      throw new Error(handleError(error, 'Registration failed'))
    } finally {
      loading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await signalRService.stop()
    } catch (error) {
      console.error('Error stopping SignalR connection:', error)
    } finally {
      clearAuth()
    }
  }

  const loadProfile = async (): Promise<void> => {
    try {
      user.value = await userService.getProfile()
    } catch (error) {
      console.error('Failed to load user profile:', error)
      await logout()
      throw new Error(handleError(error, 'Failed to load profile'))
    }
  }

  const updateProfile = async (userData: UpdateUserProfileDto): Promise<void> => {
    try {
      loading.value = true
      user.value = await userService.updateProfile(userData)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to update profile'))
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (passwordData: ChangePasswordDto): Promise<void> => {
    try {
      loading.value = true
      await userService.changePassword(passwordData)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to change password'))
    } finally {
      loading.value = false
    }
  }

  const uploadAvatar = async (file: File): Promise<void> => {
    try {
      loading.value = true
      user.value = await userService.uploadAvatar(file)
    } catch (error) {
      throw new Error(handleError(error, 'Failed to upload avatar'))
    } finally {
      loading.value = false
    }
  }

  const deleteAvatar = async (): Promise<void> => {
    try {
      loading.value = true
      user.value = await userService.deleteAvatar()
    } catch (error) {
      throw new Error(handleError(error, 'Failed to delete avatar'))
    } finally {
      loading.value = false
    }
  }

  const tryRefreshToken = async (): Promise<boolean> => {
    if (!refreshToken.value) return false

    try {
      const response = await authService.refreshToken({ refreshToken: refreshToken.value })
      setAuth(response.accessToken, response.refreshToken)
      return true
    } catch {
      await logout()
      return false
    }
  }

  const initializeAuth = async (): Promise<void> => {
    if (!token.value) return

    if (!isTokenValid(token.value)) {
      const refreshed = await tryRefreshToken()
      if (!refreshed) return
    }

    try {
      await loadProfile()
      await signalRService.initialize()
    } catch {
      await logout()
    }
  }

  return {
    // State
    user: readonly(user),
    loading: readonly(loading),
    
    // Getters
    isAuthenticated,
    currentUser,
    
    // Actions
    login,
    register,
    logout,
    loadProfile,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    tryRefreshToken,
    initializeAuth
  }
})