import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { jwtDecode } from 'jwt-decode';
import authService from '@/services/authService';
import userService from '@/services/userService'; // Add this import
import router from '@/router';
import { RouteNames } from '@/router';
import type { LoginPayload, RegisterPayload, UserProfile } from '@/services/types';

interface JwtPayload {
  sub: string;
  username: string;
  profilePictureUrl?: string;
  exp: number;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const setToken = (newToken: string | null) => {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  // New method to fetch fresh user data
  const fetchUserProfile = async () => {
    try {
      const response = await userService.getProfile();
      user.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  };

  const checkAuth = async () => { // Make this async
    if (!token.value) {
      user.value = null;
      return;
    }

    try {
      const payload = jwtDecode<JwtPayload>(token.value);
      const isExpired = Date.now() >= payload.exp * 1000;

      if (isExpired) {
        logout();
      } else {
        // Set basic user info from token
        user.value = {
          id: parseInt(payload.sub, 10),
          username: payload.username, // Temporary, will be overwritten
          email: '',
          profilePictureUrl: payload.profilePictureUrl || undefined,
        };
        
        // Fetch fresh user data from the API
        try {
          await fetchUserProfile();
        } catch (error) {
          // If fetching fails, we still have basic data from the token
          console.error('Failed to fetch fresh user data:', error);
        }
      }
    } catch (e) {
      console.error("Invalid token found, logging out.", e);
      logout();
    }
  };
  
  const login = async (credentials: LoginPayload) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.login(credentials);
      setToken(response.data);
      await checkAuth(); // This will now fetch fresh user data

      const redirectPath = router.currentRoute.value.query.redirect as string | undefined;
      await router.push(redirectPath || { name: RouteNames.SERVER_SELECT });
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Invalid username or password';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const register = async (userData: RegisterPayload) => {
    loading.value = true;
    error.value = null;
    try {
      await authService.register(userData);
      await router.push({ name: RouteNames.LOGIN, query: { registered: 'true' } });
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const logout = async () => {
    setToken(null);
    user.value = null;
    if (router.currentRoute.value.name !== RouteNames.LOGIN) {
       await router.push({ name: RouteNames.LOGIN });
    }
  };

  // Update user data and ensure reactivity
  const updateUserData = (updates: Partial<UserProfile>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates };
    }
  };

  // Initialize - note this is now async
  checkAuth();

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    fetchUserProfile,
    updateUserData,
  };
});