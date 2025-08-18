<template>
  <div v-if="isConnected" class="voice-control-bar">
    <div class="control-section">
      <div class="channel-info">
        <Volume2 class="w-4 h-4 text-green-400" />
        <span class="text-sm font-medium">{{ channelName }}</span>
        <span class="text-xs text-gray-400">({{ participantCount }} participants)</span>
      </div>
      
      <div class="controls">
        <button
          @click="toggleMute"
          :class="[
            'control-button',
            isMuted ? 'muted' : 'active'
          ]"
          :title="isMuted ? 'Unmute' : 'Mute'"
        >
          <MicOff v-if="isMuted" class="w-4 h-4" />
          <Mic v-else class="w-4 h-4" />
        </button>

        <ScreenShareButton />

        <button
          @click="disconnectVoice"
          class="control-button disconnect"
          title="Disconnect"
        >
          <PhoneOff class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Screen Share Viewer -->
    <ScreenShareViewer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Volume2, Mic, MicOff, PhoneOff } from 'lucide-vue-next';
import { useAppStore } from '@/stores/app';
import { livekitService } from '@/services/livekitService';
import ScreenShareButton from './ScreenShareButton.vue';
import ScreenShareViewer from './ScreenShareViewer.vue';

const appStore = useAppStore();

const isConnected = computed(() => appStore.currentVoiceChannelId !== null);
const isMuted = computed(() => appStore.selfMuted);
const participantCount = ref(0);

const channelName = computed(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId || !appStore.currentServer) return '';
  
  const channel = appStore.currentServer.channels.find(c => c.id === channelId);
  return channel?.name || 'Voice Channel';
});

const toggleMute = () => {
  appStore.toggleSelfMute();
};

const disconnectVoice = async () => {
  const channelId = appStore.currentVoiceChannelId;
  if (channelId) {
    await appStore.leaveVoiceChannel(channelId);
    // LiveKit disconnection is handled by the integration composable
  }
};

const updateParticipantCount = () => {
  participantCount.value = livekitService.getTotalParticipantCount();
  
};

// Set up LiveKit event listeners
onMounted(() => {
  // Set up event listeners
  const onParticipantConnected = () => {
    
    updateParticipantCount();
  };
  
  const onParticipantDisconnected = () => {
    
    updateParticipantCount();
  };
  
  livekitService.onParticipantConnected(onParticipantConnected);
  livekitService.onParticipantDisconnected(onParticipantDisconnected);
  
  // Update participant count every second to ensure we stay in sync
  const updateInterval = setInterval(updateParticipantCount, 1000);
  
  // Initial participant count update
  updateParticipantCount();
  
  // Cleanup on unmount
  onUnmounted(() => {
    clearInterval(updateInterval);
  });
});
</script>

<style scoped>
.voice-control-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgb(31 41 55);
  border-top: 1px solid rgb(75 85 99);
  padding: 1rem;
  z-index: 50;
}

.control-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 80rem;
  margin: 0 auto;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border-radius: 9999px;
  transition: colors 0.2s;
  border: none;
  cursor: pointer;
}

.control-button.active {
  background-color: rgb(22 163 74);
  color: white;
}

.control-button.active:hover {
  background-color: rgb(34 197 94);
}

.control-button.muted {
  background-color: rgb(220 38 38);
  color: white;
}

.control-button.muted:hover {
  background-color: rgb(239 68 68);
}

.control-button.disconnect {
  background-color: rgb(220 38 38);
  color: white;
}

.control-button.disconnect:hover {
  background-color: rgb(239 68 68);
}
</style>
