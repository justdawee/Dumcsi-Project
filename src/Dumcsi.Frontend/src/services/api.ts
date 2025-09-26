import axios from 'axios';
import {useAuthStore} from '@/stores/auth';
import router from '@/router';

export interface ApiResponse<T = any> {
    isSuccess: boolean;
    data: T;
    message: string;
    error?: {
        code: string;
        message: string;
    };
}

const api = axios.create({
    // Default to same-origin proxy path. Nginx proxies /api to backend in Docker.
    baseURL: import.meta.env.VITE_API_URL || '/api',
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
            // Don't modify the response, let services handle ApiResponse
            return response;
        },
        (error) => {
            const authStore = useAuthStore();

            // Handle 401 for expired sessions (except login endpoint)
            if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
                console.error("Session expired or token is invalid. Logging out.");
                authStore.logout();
                router.push({name: 'Login'});
                return Promise.reject(error);
            }

            // Handle 403 for server access denied
            if (error.response?.status === 403 && error.config?.url?.includes('/server/')) {
                console.warn("Access denied to server. User may have been removed.");
                // Extract server ID from URL if possible to handle specific cases
                const serverIdMatch = error.config.url.match(/\/server\/(\d+)/);
                if (serverIdMatch) {
                    const serverId = parseInt(serverIdMatch[1]);
                    // Redirect to server select page
                    if (router.currentRoute.value.params.serverId && 
                        parseInt(router.currentRoute.value.params.serverId as string) === serverId) {
                        router.push({name: 'ServerSelect'});
                    }
                }
                return Promise.reject(error);
            }

            return Promise.reject(error);
        }
    );
};

setupInterceptors();

export default api;
