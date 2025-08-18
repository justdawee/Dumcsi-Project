import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from "@/stores/app.ts";
import {signalRService} from "@/services/signalrService.ts";

export const RouteNames = {
    // Guest routes
    LOGIN: 'Login',
    REGISTER: 'Register',

    // Authenticated routes
    APP: 'App', // Main application layout
    SERVER_SELECT: 'ServerSelect',
    FRIENDS: 'Friends',
    DIRECT_MESSAGE_ROOT: 'DirectMessages',
    DIRECT_MESSAGE: 'DirectMessage',
    SERVER: 'Server',
    CHANNEL: 'Channel',
    VOICE_CHANNEL: 'VoiceChannel',
    SETTINGS: 'Settings',
    USER_SETTINGS: 'UserSettings', // Kept for backward compatibility
};

declare module 'vue-router' {
    interface RouteMeta {
        requiresAuth?: boolean;
        requiresGuest?: boolean;
    }
}

const routes: readonly RouteRecordRaw[] = [
    {
        path: '/auth/login',
        name: RouteNames.LOGIN,
        component: () => import('@/views/auth/LoginView.vue'),
        meta: {requiresGuest: true}
    },
    {
        path: '/auth/register',
        name: RouteNames.REGISTER,
        component: () => import('@/views/auth/RegisterView.vue'),
        meta: {requiresGuest: true}
    },
    {
        // Redirect /auth to the login page by default.
        path: '/auth',
        redirect: {name: RouteNames.LOGIN}
    },
    {
        path: '/',
        component: () => import('@/views/AppView.vue'),
        meta: {requiresAuth: true},
        children: [
            {
                path: '',
                name: RouteNames.APP, // Moved name here
                component: () => import('@/views/ServerSelectView.vue')
            },
            {
                path: 'servers',
                name: RouteNames.SERVER_SELECT,
                component: () => import('@/views/ServerSelectView.vue')
            },
            {
                path: 'friends',
                name: RouteNames.FRIENDS,
                component: () => import('@/views/FriendsView.vue')
            },
            {
                path: 'dm',
                name: RouteNames.DIRECT_MESSAGE_ROOT,
                component: () => import('@/views/DmView.vue'),
                children: [
                    {
                        path: ':userId',
                        name: RouteNames.DIRECT_MESSAGE,
                        component: () => import('@/views/DmChannelView.vue')
                    }
                ]
            },
            {
                path: 'servers/:serverId',
                name: RouteNames.SERVER,
                component: () => import('@/views/ServerView.vue'),
                children: [
                    {
                        path: 'channels/:channelId',
                        name: RouteNames.CHANNEL,
                        component: () => import('@/views/ChannelView.vue')
                    },
                    {
                        path: 'voice/:channelId',
                        name: RouteNames.VOICE_CHANNEL,
                        component: () => import('@/views/VoiceChannelView.vue')
                    }
                ]
            },
            {
                path: 'settings/:section?',
                name: RouteNames.SETTINGS,
                component: () => import('@/views/settings/SettingsView.vue')
            },
            {
                // Legacy route - redirect to new settings structure
                path: 'settings/profile',
                name: RouteNames.USER_SETTINGS,
                redirect: { name: RouteNames.SETTINGS, params: { section: 'profile' } }
            }
        ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFoundView.vue')
    }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore();

    if (authStore.token && !authStore.user) {
        try {
            await authStore.checkAuth();
        } catch (err) {
        }
    }

    const isAuthenticated = authStore.isAuthenticated;
    const requiresAuth = to.matched.some(r => r.meta.requiresAuth);
    const requiresGuest = to.matched.some(r => r.meta.requiresGuest);

    if (requiresAuth && !isAuthenticated) {
        next({
            name: RouteNames.LOGIN,
            query: {redirect: to.fullPath}
        });
        return;
    }

    if (requiresGuest && isAuthenticated) {
        next({name: RouteNames.SERVER_SELECT});
        return;
    }

    if (isAuthenticated && authStore.user) {
        const appStore = useAppStore();

        if (appStore.connectionState !== 'connected' &&
            appStore.connectionState !== 'connecting') {
            // starting SignalR on authenticated routes
            try {
                await signalRService.start();
            } catch (err) {
                console.error('Router guard: Failed to start SignalR:', err);
            }
        }
    }
    next();
});

export default router;
