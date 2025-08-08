import { watch, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { livekitService } from '@/services/livekitService';

export function useLiveKitIntegration() {
  const appStore = useAppStore();
  const authStore = useAuthStore();

  // Watch for voice channel changes and sync with LiveKit
  const unwatch = watch(
    () => appStore.currentVoiceChannelId,
    async (newChannelId, oldChannelId) => {
      try {
        // Disconnect from previous LiveKit room if any
        if (oldChannelId && livekitService.getRoom()) {
          await livekitService.disconnectFromRoom();
        }

        // Connect to new LiveKit room if joined a voice channel
        if (newChannelId) {
          const user = authStore.user;
          const userId = appStore.currentUserId;
          
          if (user && userId) {
            const participantName = user.username || `User_${userId}`;
            await livekitService.connectToRoom(newChannelId, participantName);
            console.log('Connected to LiveKit room for channel:', newChannelId);
          }
        }
      } catch (error) {
        console.error('Failed to sync LiveKit with voice channel:', error);
      }
    }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    unwatch();
    livekitService.cleanup();
  });

  return {
    livekitService
  };
}