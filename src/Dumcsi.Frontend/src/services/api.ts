import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast'; // Assuming you have a toast composable

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5230/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setupInterceptors = () => {
  // Request interceptor to add the authentication token to headers.
  api.interceptors.request.use(
    (config) => {
      const authStore = useAuthStore();
      // Only attach the token if it exists.
      if (authStore.token) {
        config.headers.Authorization = `Bearer ${authStore.token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle global API errors.
  api.interceptors.response.use(
    // Directly return successful responses.
    (response) => response,
    
    // Handle API errors globally.
    async (error: AxiosError) => {
      if (!error.response) {
        // Handle network errors (e.g., server is down, no internet).
        useToast().addToast({
          type: 'danger',
          title: 'Network Error',
          message: 'Could not connect to the server. Please check your connection.',
        });
        return Promise.reject(error);
      }

      const authStore = useAuthStore();
      const { status, data } = error.response;
      const errorMessage = (data as { message?: string })?.message || 'An unexpected error occurred.';

      switch (status) {
        case 401: {
          // Unauthorized: User is not authenticated or token is invalid.
          if (!authStore.loading) { 
            authStore.loading = true; // Prevent concurrent logout calls
            useToast().addToast({
              type: 'warning',
              title: 'Session Expired',
              message: 'Please log in again.',
            });
            // Awaiting ensures redirection logic completes before the original promise is rejected.
            await authStore.logout();
            authStore.loading = false;
          }
          break;
        }
        case 403:
          // Forbidden: User is authenticated but lacks permission.
          useToast().addToast({
            type: 'danger',
            title: 'Access Denied',
            message: "You don't have permission to perform this action.",
          });
          break;
        case 404:
          // Not Found: The resource doesn't exist.
          // Often handled locally in the component, but a global toast can be useful.
          console.error('Resource not found:', error.config?.url);
          break;
        default:
          // For other errors (e.g., 400, 409, 500), show a generic toast.
          // The specific component that made the call can still handle the error further.
          if (status >= 400) {
            console.error('API Error:', error.config?.url, 'Status:', status, 'Message:', errorMessage);
          }
          break;
      }
      
      // We still reject the promise so the calling component's .catch() block will run.
      // This allows local error handling, like stopping a loading spinner.
      return Promise.reject(error);
    }
  );
};

// Initialize the interceptors when this module is imported.
setupInterceptors();

export default api;