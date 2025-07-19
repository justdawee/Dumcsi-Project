import {createApp} from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { signalRService } from './services/signalrService';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const authStore = useAuthStore();
let signalRInitialized = false;

// Initialize Pinia store
router.isReady().then(async () => {
  if (authStore.token) {
    try {
      await authStore.checkAuth();
      if (authStore.isAuthenticated && !signalRInitialized) {
        console.log('Initializing SignalR connection...');
        await signalRService.initialize();
        signalRInitialized = true;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }
  app.mount('#app');
});

// Handle authentication state changes
let authStateTimeout: ReturnType<typeof setTimeout> | null = null;
authStore.$subscribe((_, state) => {
  if (authStateTimeout) clearTimeout(authStateTimeout);
  
  authStateTimeout = setTimeout(async () => {
    if (state.token && !signalRService.isConnected && authStore.isAuthenticated) {
      console.log('User authenticated, initializing SignalR...');
      await signalRService.initialize();
      signalRInitialized = true;
    }
    
    if (!state.token && signalRService.isConnected) {
      console.log('User logged out, stopping SignalR...');
      await signalRService.stop();
      signalRInitialized = false;
    }
  }, 100);
});

// Reinitialize SignalR when the app becomes visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authStore.isAuthenticated && !signalRService.isConnected) {
    signalRService.initialize();
  }
});

// Clean up SignalR connection on app unload
window.addEventListener('beforeunload', () => {
  if (signalRService.isConnected) {
    signalRService.stop();
  }
});