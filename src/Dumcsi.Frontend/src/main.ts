import { createApp } from 'vue';
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

// Wait for router to be ready before mounting
router.isReady().then(async () => {
  // Check if user is authenticated
  if (authStore.token) {
    try {
      // Verify token is still valid
      await authStore.checkAuth();
      
      // Initialize SignalR connection if authenticated
      if (authStore.isAuthenticated && !signalRInitialized) {
        console.log('Initializing SignalR connection...');
        await signalRService.initialize();
        signalRInitialized = true;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }
  
  // Mount the app
  app.mount('#app');
});

// Setup auth state change listener
let authStateTimeout: ReturnType<typeof setTimeout> | null = null;
authStore.$subscribe((_, state) => {
  if (authStateTimeout) clearTimeout(authStateTimeout);
  
  authStateTimeout = setTimeout(async () => {
    // When user logs in
    if (state.token && !signalRService.isConnected && authStore.isAuthenticated) {
      console.log('User authenticated, initializing SignalR...');
      await signalRService.initialize();
      signalRInitialized = true;
    }
    
    // When user logs out
    if (!state.token && signalRService.isConnected) {
      console.log('User logged out, stopping SignalR...');
      await signalRService.stop();
      signalRInitialized = false;
    }
  }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authStore.isAuthenticated && !signalRService.isConnected) {
    signalRService.initialize();
  }
});

// Cleanup on app unmount
window.addEventListener('beforeunload', () => {
  if (signalRService.isConnected) {
    signalRService.stop();
  }
});