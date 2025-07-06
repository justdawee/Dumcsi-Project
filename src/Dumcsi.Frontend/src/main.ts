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

// Wait for router to be ready before mounting
router.isReady().then(async () => {
  // Check if user is authenticated
  if (authStore.token) {
    try {
      // Verify token is still valid
      await authStore.checkAuth();
      
      // Initialize SignalR connection if authenticated
      if (authStore.isAuthenticated) {
        console.log('Initializing SignalR connection...');
        await signalRService.initialize();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token is invalid, auth store will handle cleanup
    }
  }
  
  // Mount the app
  app.mount('#app');
});

// Setup auth state change listener
authStore.$subscribe((_, state) => {
  // When user logs in
  if (state.token && !signalRService.isConnected) {
    console.log('User authenticated, initializing SignalR...');
    signalRService.initialize();
  }
  
  // When user logs out
  if (!state.token && signalRService.isConnected) {
    console.log('User logged out, stopping SignalR...');
    signalRService.stop();
  }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authStore.isAuthenticated && !signalRService.isConnected) {
    // Reconnect when page becomes visible
    signalRService.initialize();
  }
});

// Cleanup on app unmount
window.addEventListener('beforeunload', () => {
  if (signalRService.isConnected) {
    signalRService.stop();
  }
});