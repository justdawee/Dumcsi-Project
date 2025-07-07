import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

// Az ApiResponse típust megtartjuk a sikeres válaszokhoz.
interface ApiResponse<T = any> {
  isSuccess: boolean;
  data: T;
  message: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5230/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const setupInterceptors = () => {
  api.interceptors.request.use(
    (config) => {
      const authStore = useAuthStore();
      if (authStore.token) {
        config.headers.Authorization = `Bearer ${authStore.token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      // A sikeres válaszokból továbbra is csak a 'data' részt adjuk vissza.
      if (response.data && typeof response.data.isSuccess === 'boolean') {
        const apiResponse = response.data as ApiResponse;
        if (apiResponse.isSuccess) {
          response.data = apiResponse.data;
          return response;
        }
      }
      return response;
    },
    (error) => {
      const authStore = useAuthStore();
      
      // Csak a globális, lejárt munkamenet hibát kezeljük itt.
      // A bejelentkezési hibát (ami szintén 401) nem, azt a `login` függvény catch blokkja kezeli.
      if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
        console.error("Session expired or token is invalid. Logging out.");
        authStore.logout();
        router.push({ name: 'Login' });
      }
      
      // Minden más hibát egyszerűen továbbadunk, hogy a hívó fél `catch` blokkja kezelhesse.
      return Promise.reject(error);
    }
  );
};

setupInterceptors();

export default api;
export type { ApiResponse };
