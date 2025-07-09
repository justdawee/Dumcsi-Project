import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
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
    path: '/',
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
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/ProfileSettingsView.vue')
      },
      {
        path: 'dms/:dmId',
        name: 'direct-message',
        component: () => import('@/views/DirectMessageView.vue')
      }
    ]
  },
  {
    path: '/invite/:code',
    name: 'invite',
    component: () => import('@/views/InviteView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'app' })
  } else {
    next()
  }
})

export default router