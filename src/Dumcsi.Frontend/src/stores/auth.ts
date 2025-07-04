import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { jwtDecode } from 'jwt-decode';
import authService from '@/services/authService';
import router from '@/router';
import { RouteNames } from '@/router';
import type { LoginPayload, RegisterPayload, UserProfile } from '@/services/types';

// Define the shape of the JWT payload for type safety
interface JwtPayload {
  sub: string;
  username: string;
  profilePictureUrl?: string;
  exp: number; // Expiration time (in seconds)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  //A computed property that is true only if there is a valid, non-expired token.
  const isAuthenticated = computed(() => !!token.value && !!user.value);

  // Function to set the token and update localStorage.
  const setToken = (newToken: string | null) => {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  // Function to check the validity of the token and update user state.
  const checkAuth = () => {
    if (!token.value) {
      user.value = null;
      return;
    }

    try {
      const payload = jwtDecode<JwtPayload>(token.value);
      const isExpired = Date.now() >= payload.exp * 1000;

      if (isExpired) {
        // If the token has expired, log the user out.
        logout();
      } else {
        // If the token is valid, ensure the user object is populated.
        user.value = {
          id: parseInt(payload.sub, 10),
          username: payload.username,
          email: '', // Email is not in the token, should be fetched from an API if needed
          profilePictureUrl: payload.profilePictureUrl || undefined,
        };
      }
    } catch (e) {
      // If the token is malformed, it's invalid. Log the user out.
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
      checkAuth(); // Populate user state immediately after login

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
      // After successful registration, redirect to the login page with a success message.
      await router.push({ name: RouteNames.LOGIN, query: { registered: 'true' } });
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const logout = async () => {
    // To properly reset state, we can call the $reset method if not using setup store syntax,
    // or manually reset each ref.
    setToken(null);
    user.value = null;
    // Redirect to login page
    if (router.currentRoute.value.name !== RouteNames.LOGIN) {
       await router.push({ name: RouteNames.LOGIN });
    }
  };

  const updateUserData = (updates: Partial<UserProfile>) => {
    if (user.value) {
      // Create a new object to ensure reactivity
      user.value = { ...user.value, ...updates };
    }
  };

  // Perform an initial authentication check when the store is initialized.
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
    updateUserData,
  };
});