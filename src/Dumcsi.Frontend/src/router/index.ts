import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/auth',
    redirect: '/auth/login',
    children: [
      // ... (ez a rész változatlan)
    ]
  },
  {
    path: '/',
    // name: 'App',  // <-- EZT A SORT TÖRÖLD KI
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
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } 
  // Check if route requires guest (not authenticated)
  else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'ServerSelect' })
  } 
  else {
    next()
  }
})

export default router