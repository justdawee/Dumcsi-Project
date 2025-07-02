import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/auth',
    redirect: { name: 'Login' }
  },
  {
    path: '/',
    component: () => import('@/views/AppView.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'ServerSelect' }
      },
      {
        path: 'servers',
        name: 'ServerSelect',
        component: () => import('@/views/ServerSelectView.vue')
      },
      {
        path: 'servers/:serverId',
        name: 'Server',
        component: () => import('@/views/ServerView.vue'),
        children: [
          {
            path: 'channels/:channelId',
            name: 'Channel',
            component: () => import('@/views/ChannelView.vue')
          }
        ]
      },
      {
        path: 'settings/profile',
        name: 'UserSettings',
        component: () => import('@/views/settings/ProfileSettingsView.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } 
  else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'ServerSelect' });
  } 
  else {
    next();
  }
});

export default router;
