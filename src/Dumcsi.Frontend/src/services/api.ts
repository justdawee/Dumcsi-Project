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
            if (authStore.isAuthenticated) {
              authStore.logout();
              router.push({ name: 'Login' });
              addToast({
                type: 'warning',
                title: 'Session Expired',
                message: 'Please login again to continue.',
                duration: 5000
              });
            }
            break;
            
          case 403:
            // Forbidden
            addToast({
              type: 'danger',
              title: 'Access Denied',
              message: 'You do not have permission to perform this action.',
              duration: 5000
            });
            break;
            
          case 404:
            // Not found
            addToast({
              type: 'warning',
              title: 'Not Found',
              message: errorMessage,
              duration: 4000
            });
            break;
            
          case 429:
            // Rate limited
            addToast({
              type: 'warning',
              title: 'Too Many Requests',
              message: 'Please slow down and try again later.',
              duration: 5000
            });
            break;
            
          case 500:
          case 502:
          case 503:
            // Server errors
            addToast({
              type: 'danger',
              title: 'Server Error',
              message: 'Something went wrong on our end. Please try again later.',
              duration: 5000
            });
            break;
            
          default:
            // Other errors
            addToast({
              type: 'danger',
              title: 'Error',
              message: errorMessage,
              duration: 5000
            });
        }
      } else if (error.request) {
        // Network error
        addToast({
          type: 'danger',
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
          duration: 5000
        });
      } else {
        // Other errors
        addToast({
          type: 'danger',
          title: 'Error',
          message: error.message || 'An unexpected error occurred.',
          duration: 5000
        });
      }
      
      return Promise.reject(error);
    }
  );
};

// Helper function to determine if success message should be shown
const shouldShowSuccessMessage = (config: any): boolean => {
  // Show success messages for mutations (POST, PUT, PATCH, DELETE)
  // but not for GET requests
  const method = config.method?.toLowerCase();
  const mutationMethods = ['post', 'put', 'patch', 'delete'];
  
  // Skip success messages for certain endpoints
  const skipEndpoints = ['/auth/login', '/auth/register', '/messages'];
  const shouldSkip = skipEndpoints.some(endpoint => config.url?.includes(endpoint));
  
  return mutationMethods.includes(method) && !shouldSkip;
};

// Initialize interceptors
setupInterceptors();

export default api;