import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import router from '@/router';
import { RouteNames } from '@/router';
// TÖRÖLVE: import { useAppStore } from './app'; - Eltávolítjuk a felső szintű importot
import authService from '@/services/authService';
import userService from '@/services/userService';
import { signalRService } from '@/services/signalrService';
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload, LoginPayload, RegisterPayload, UserProfile, AuthResponse } from '@/services/types';
import { getDisplayMessage } from '@/services/errorHandler';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const clearError = () => {
    error.value = null;
  };

  const setToken = (newToken: string | null) => {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

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

  const checkAuth = async () => {
    if (!token.value) {
      user.value = null;
      return;
    }

    try {
      const payload = jwtDecode<JwtPayload>(token.value);
      const isExpired = Date.now() >= payload.exp * 1000;

      if (isExpired) {
        await logout();
      } else {
        if (!user.value) {
          await fetchUserProfile();
        }
      }
    } catch (e) {
      console.error("Invalid token found, logging out.", e);
      await logout();
    }
  };
  
  const login = async (credentials: LoginPayload) => {
    loading.value = true;
    error.value = null;
    try {
      const response: AuthResponse = await authService.login(credentials);
      setToken(response.accessToken); 
      
      await checkAuth();

      const redirectPath = router.currentRoute.value.query.redirect as string | undefined;
      await router.push(redirectPath || { name: RouteNames.SERVER_SELECT });
    } catch (err: any) {
      error.value = getDisplayMessage(err);
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
      await router.push({ 
        name: RouteNames.LOGIN, 
        query: { 
          registered: 'true',
          username: userData.username
        } 
      });
    } catch (err: any) {
      error.value = getDisplayMessage(err);
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const logout = async () => {
    const { useAppStore } = await import('./app');
    const appStore = useAppStore();

    await signalRService.stop();
    setToken(null);
    user.value = null;
    appStore.$reset();
    if (router.currentRoute.value.name !== 'Login') {
       await router.push({ name: 'Login' });
    }
  };

  const updateUserData = (updates: Partial<UserProfile>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates };
    }
  };

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    clearError,
    login,
    register,
    logout,
    checkAuth,
    fetchUserProfile,
    updateUserData,
  };
});
