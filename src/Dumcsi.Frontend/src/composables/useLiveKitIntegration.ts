import { watch, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { livekitService } from '@/services/livekitService';

export function useLiveKitIntegration() {
  const appStore = useAppStore();
  const authStore = useAuthStore();

  const unwatch = watch(
    () => appStore.currentVoiceChannelId,
    async (newChannelId, oldChannelId) => {
      // Skip if channel hasn't actually changed
      if (newChannelId === oldChannelId) {
        return;
      }

      try {
        // Disconnect from previous LiveKit room if any
        if (oldChannelId && livekitService.getRoom()) {
          await livekitService.disconnectFromRoom();
        }

        // Connect to new LiveKit room if joined a voice channel
        if (newChannelId) {
          const user = authStore.user;
          const userId = appStore.currentUserId;

          // Only connect if current user is actually in the channel user list
          const channelUsers = appStore.voiceChannelUsers.get(newChannelId) || [];

          if (user && userId && channelUsers.some(u => u.id === userId)) {
            const rawName = user.username || `User_${userId}`;
            const participantName = rawName.replace(/[^a-zA-Z0-9_-]/g, '') || `User_${userId}`;
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