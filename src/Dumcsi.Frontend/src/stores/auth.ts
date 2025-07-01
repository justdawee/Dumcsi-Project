import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token'))
  const user = ref<{ id: number, username: string } | null>(null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  const setToken = (newToken: string | null) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''))
      return JSON.parse(jsonPayload)
    } catch (e) {
      return null
    }
  }

  const login = async (credentials: any) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authService.login(credentials)
      const token = response.data
      setToken(token)
      
      // Parse user info from JWT
      const payload = parseJwt(token)
      user.value = {
        id: parseInt(payload.sub),
        username: payload.username
      }
      
      // Redirect to app
      const redirect = router.currentRoute.value.query.redirect
      const redirectPath = Array.isArray(redirect) ? redirect[0] : redirect
      await router.push(redirectPath || '/servers')
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Invalid username or password'
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (userData: any) => {
    loading.value = true
    error.value = null
    
    try {
      await authService.register(userData)
      // Auto-login after successful registration
      await login({
        usernameOrEmail: userData.username,
        password: userData.password
      })
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    setToken(null)
    user.value = null
    await router.push('/auth/login')
  }

  // Initialize user from token if exists
  if (token.value) {
    const payload = parseJwt(token.value)
    if (payload) {
      user.value = {
        id: parseInt(payload.sub),
        username: payload.username
      }
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout
  }
})