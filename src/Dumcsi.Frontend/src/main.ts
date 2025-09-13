import {createApp} from 'vue';
import {createPinia} from 'pinia';
import closeOnBackdrop from '@/directives/closeOnBackdrop';
import App from './App.vue';
import router from './router';
import {useAuthStore} from './stores/auth';
import {signalRService} from './services/signalrService';
import './style.css';
import { i18n } from './i18n';

const app = createApp(App);
const pinia = createPinia();

app.directive('backdrop-close', closeOnBackdrop);

app.use(pinia);
app.use(router);
app.use(i18n);

const authStore = useAuthStore();

// Initialize Pinia store
router.isReady().then(async () => {
    if (authStore.token) {
        try {
            await authStore.checkAuth();
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
            // start SignalR when authenticated
            await signalRService.start();
        }

        if (!state.token && signalRService.isConnected) {
            // stop SignalR when logged out
            await signalRService.stop();
        }
    }, 100);
});

// Reinitialize SignalR when the app becomes visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && authStore.isAuthenticated && !signalRService.isConnected) {
        signalRService.start();
    }
});

// Clean up SignalR connection on app unload
window.addEventListener('beforeunload', () => {
    if (signalRService.isConnected) {
        signalRService.stop();
    }
});
