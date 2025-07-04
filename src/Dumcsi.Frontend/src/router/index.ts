import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export const RouteNames = {
  // Guest routes
  LOGIN: 'Login',
  REGISTER: 'Register',
  
  // Authenticated routes
  APP: 'App', // Main application layout
  SERVER_SELECT: 'ServerSelect',
  SERVER: 'Server',
  CHANNEL: 'Channel',
  USER_SETTINGS: 'UserSettings',
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
    meta: { requiresGuest: true }
  },
  {
    path: '/auth/register',
    name: RouteNames.REGISTER,
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresGuest: true }
  },
  {
    // Redirect /auth to the login page by default.
    path: '/auth',
    redirect: { name: RouteNames.LOGIN }
  },
  {
    path: '/',
    component: () => import('@/views/AppView.vue'),
    meta: { requiresAuth: true },
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
        path: 'servers/:serverId',
        name: RouteNames.SERVER,
        component: () => import('@/views/ServerView.vue'),
        children: [
          {
            path: 'channels/:channelId',
            name: RouteNames.CHANNEL,
            component: () => import('@/views/ChannelView.vue')
          }
        ]
      },
      {
        path: 'settings/profile',
        name: RouteNames.USER_SETTINGS,
        component: () => import('@/views/settings/ProfileSettingsView.vue')
      }
    ]
  }
  // Optional: Add a 404 catch-all route
  //{
  //  path: '/:pathMatch(.*)*',
  //  name: 'NotFound',
  //  component: () => import('@/views/NotFoundView.vue') // You would need to create this component
  //}
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  
  authStore.checkAuth(); // Assuming this method checks for token expiration and logs out if needed.

  const isAuthenticated = authStore.isAuthenticated;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);

  if (requiresAuth && !isAuthenticated) {
    // If the route requires authentication and the user is not authenticated,
    next({ name: RouteNames.LOGIN, query: { redirect: to.fullPath } });
  } else if (requiresGuest && isAuthenticated) {
    // If the route is for guests (like login/register) and the user is already logged in,
    // redirect them to the main server selection page.
    next({ name: RouteNames.SERVER_SELECT });
  } else {
    // Otherwise, allow navigation.
    next();
  }
});

export default router;