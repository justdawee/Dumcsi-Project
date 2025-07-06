import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import router from '@/router';

// API Response típus definíció
interface ApiResponse<T = any> {
  isSuccess: boolean;
  data: T;
  message: string;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5230/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup interceptors
const setupInterceptors = () => {
  // Request interceptor to add auth token
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

  // Response interceptor for unified response handling
  api.interceptors.response.use(
    (response) => {
      // Check if response follows the new unified structure
      if (response.data && typeof response.data.isSuccess === 'boolean') {
        const apiResponse = response.data as ApiResponse;
        
        if (apiResponse.isSuccess) {
          // Success: extract and return only the data field
          response.data = apiResponse.data;
          
          // Optionally show success message for certain operations
          if (apiResponse.message && shouldShowSuccessMessage(response.config)) {
            const { addToast } = useToast();
            addToast({
              type: 'success',
              message: apiResponse.message,
              duration: 3000
            });
          }
          
          return response;
        } else {
          // API returned isSuccess: false
          const errorMessage = apiResponse.message || 'An error occurred';
          const { addToast } = useToast();
          
          addToast({
            type: 'danger',
            title: 'Error',
            message: errorMessage,
            duration: 5000
          });
          
          return Promise.reject(new Error(errorMessage));
        }
      }
      
      // If not using unified structure, pass through unchanged
      return response;
    },
    (error) => {
      const { addToast } = useToast();
      const authStore = useAuthStore();
      
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.message || 'An error occurred';
        
        switch (status) {
          case 401:
            // Unauthorized: Clear auth and redirect to login
            authStore.logout();
            router.push({ name: 'Login' });
            addToast({
              type: 'warning',
              title: 'Session Expired',
              message: 'Please login again to continue.',
            });
            break;
            
          case 403:
            // Forbidden: User doesn't have permission
            addToast({
              type: 'danger',
              title: 'Access Denied',
              message: "You don't have permission to perform this action.",
            });
            break;
            
          case 404:
            // Not Found: Resource doesn't exist
            console.error('Resource not found:', error.config?.url);
            // Let individual components handle 404s
            break;
            
          case 422:
            // Validation error
            if (error.response.data?.errors) {
              const errors = error.response.data.errors;
              const firstError = Object.values(errors)[0];
              addToast({
                type: 'danger',
                title: 'Validation Error',
                message: Array.isArray(firstError) ? firstError[0] : firstError,
              });
            }
            break;
            
          case 500:
            // Server error
            addToast({
              type: 'danger',
              title: 'Server Error',
              message: 'Something went wrong on the server. Please try again later.',
            });
            break;
            
          default:
            // Other errors
            if (status >= 400) {
              addToast({
                type: 'danger',
                title: `Error ${status}`,
                message: errorMessage,
              });
            }
            break;
        }
      } else if (error.request) {
        // Request was made but no response received
        addToast({
          type: 'danger',
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
        });
      }
      
      return Promise.reject(error);
    }
  );
};

// Helper function to determine if success message should be shown
const shouldShowSuccessMessage = (config: any): boolean => {
  // Show success messages for POST, PUT, PATCH, DELETE operations
  const method = config.method?.toUpperCase();
  const showForMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  // Don't show for certain endpoints (like sending messages)
  const silentEndpoints = [
    '/messages',
    '/auth/login',
    '/auth/register'
  ];
  
  const isSilentEndpoint = silentEndpoints.some(endpoint => 
    config.url?.includes(endpoint)
  );
  
  return showForMethods.includes(method) && !isSilentEndpoint;
};

// Initialize interceptors
setupInterceptors();

export default api;
export type { ApiResponse };