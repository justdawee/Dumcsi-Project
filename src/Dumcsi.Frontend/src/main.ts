import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth state
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()

// Try to restore user session
if (authStore.token) {
  authStore.fetchCurrentUser().catch(() => {
    // If token is invalid, clear auth data
    authStore.clearAuthData()
  })
}

app.mount('#app')