import { useRouter } from 'vue-router';
import { RouteNames } from '@/router';

export function useCloseSettings() {
  const router = useRouter();

  const closeSettings = () => {
    // Try to go back in browser history
    if (window.history.length > 1) {
      // Check if there's a previous state that's not a settings page
      const historyState = window.history.state;
      if (historyState?.back) {
        const resolved = router.resolve(historyState.back);
        if (resolved.name !== 'Settings') {
          router.go(-1);
          return;
        }
      }
    }
    
    // Fallback to server select if no valid history
    router.replace({ name: RouteNames.SERVER_SELECT });
  };

  return {
    closeSettings
  };
}