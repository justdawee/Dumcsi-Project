import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/invite/:code',
    name: 'invite',
    component: () => import('@/views/InviteView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app',
    name: 'app',
    component: () => import('@/views/AppView.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'server-select',
        component: () => import('@/views/ServerSelectView.vue')
      },
      {
        path: 'servers/:serverId',
        name: 'server',
        component: () => import('@/views/ServerView.vue'),
        children: [
          {
            path: 'channels/:channelId',
            name: 'channel',
            component: () => import('@/views/ChannelView.vue')
          }
        ]
      },
      {
        path: 'settings/profile',
        name: 'profile-settings',
        component: () => import('@/views/ProfileSettingsView.vue')
      }
    ]
  },
  {
    path: '/',
    redirect: '/app'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue')
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth on first navigation
  if (!authStore.isAuthenticated && localStorage.getItem('token')) {
    try {
      await authStore.initializeAuth()
    } catch {
      // Auth initialization failed, continue to route handling
    }
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (requiresGuest && authStore.isAuthenticated) {
    next('/app')
  } else {
    next()
  }
})