import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token')) // TODO: for better security, consider using a more secure storage method
  const user = ref<{ id: number, username: string, profilePictureUrl: string } | null>(null)
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

  // TODO: Consider using a library like jwt-decode for better JWT parsing
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

  // TODO: Consider adding token expiration handling
  const login = async (credentials: any) => {
  loading.value = true
  error.value = null

  try {
    const response = await authService.login(credentials)
    const token = response.data // TODO: Ensure the response contains the token directly or adjust accordingly
    setToken(token)

    // Parse user info from JWT
    const payload = parseJwt(token)
    if (payload) {
        user.value = {
          id: parseInt(payload.sub), // TODO: use radix 10 for better clarity
          username: payload.username,
          profilePictureUrl: payload.profilePictureUrl || ''
        }
    }

    // Redirect to app
    const redirect = router.currentRoute.value.query.redirect
    const redirectPath = Array.isArray(redirect) ? redirect[0] : redirect // TODO: refactor to handle array case
    await router.push(redirectPath || '/servers')
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Invalid username or password'
    throw err
  } finally {
    loading.value = false
  }
}

  // TODO: type userData more specifically we want usernameOrEmail and password
  const register = async (userData: any) => {
    loading.value = true
    error.value = null
    
    try {
      await authService.register(userData)
      // TODO: remove auto login, just redirect to login page
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
        id: parseInt(payload.sub), // TODO: use radix 10 for better clarity
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