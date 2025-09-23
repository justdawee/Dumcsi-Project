import {defineStore} from 'pinia';
import {ref, computed} from 'vue';
import router from '@/router';
import {RouteNames} from '@/router';
import {useAppStore} from './app';
import authService from '@/services/authService';
import userService from '@/services/userService';
import {signalRService} from '@/services/signalrService';
import {jwtDecode} from 'jwt-decode';
import type {
    JwtPayload,
    LoginRequestDto,
    RegisterRequestDto,
    UserProfileDto,
    TokenResponseDto,
    RefreshTokenRequestDto
} from '@/services/types';
import {getDisplayMessage} from '@/services/errorHandler';

export const useAuthStore = defineStore('auth', () => {
    const token = ref<string | null>(localStorage.getItem('token'));
    const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
    const user = ref<UserProfileDto | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const isAuthenticated = computed(() => !!token.value && !!user.value);

    const clearError = () => {
        error.value = null;
    };

    const setTokens = (tokens: TokenResponseDto | null) => {
        if (tokens) {
            token.value = tokens.accessToken;
            refreshToken.value = tokens.refreshToken;
            localStorage.setItem('token', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
        } else {
            token.value = null;
            refreshToken.value = null;
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
        }
    };

    const fetchUserProfile = async () => {
        try {
            const profile = await userService.getProfile();
            user.value = profile;
            return profile;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            throw error;
        }
    };

    const refreshAccessToken = async () => {
        if (!refreshToken.value) {
            throw new Error('No refresh token available');
        }

        try {
            const payload: RefreshTokenRequestDto = {
                refreshToken: refreshToken.value
            };
            const tokens = await authService.refresh(payload);
            setTokens(tokens);
            return tokens;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            await logout();
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
                // Try to refresh the token
                try {
                    await refreshAccessToken();
                    // Retry with new token
                    await fetchUserProfile();
                } catch {
                    await logout();
                }
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

    const login = async (credentials: LoginRequestDto) => {
        loading.value = true;
        error.value = null;
        try {
            const tokens = await authService.login(credentials);
            setTokens(tokens);

            await fetchUserProfile();

            const redirectPath = router.currentRoute.value.query.redirect as string | undefined;
            await router.push(redirectPath || {name: RouteNames.SERVER_SELECT});
        } catch (err: any) {
            error.value = getDisplayMessage(err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const register = async (userData: RegisterRequestDto) => {
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
        // Proactively stop any microphone/camera capture regardless of channel state
        try { (await import('@/services/webrtcService')).webrtcService.leaveChannel(); } catch {}
        try { (await import('@/services/livekitService')).livekitService.disconnectFromRoom(); } catch {}

        await signalRService.stop();
        setTokens(null);
        user.value = null;
        useAppStore().$reset();
        if (router.currentRoute.value.name !== RouteNames.LOGIN) {
            await router.push({name: RouteNames.LOGIN});
        }
    };

    const updateUserData = (updates: Partial<UserProfileDto>) => {
        if (user.value) {
            user.value = {...user.value, ...updates};
        }
    };

    return {
        token,
        refreshToken,
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
        refreshAccessToken,
    };
});
