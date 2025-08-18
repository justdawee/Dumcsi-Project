<template>
  <div v-if="isConnectedToVoice" class="absolute bottom-16 left-0 w-[332px] bg-main-950 border-t border-r border-border-default z-40">
    <!-- Voice Connection Section (expanded when connected) -->
    <div 
      class="px-2 py-3 border-b border-border-default space-y-3 animate-slide-down"
    >
      <!-- Connection Status -->
      <div class="px-2">
        <div class="flex items-center justify-between">
          <button
            @click="showConnectionDetails = true"
            class="flex items-center gap-2 hover:bg-main-800 rounded px-2 py-1 transition-colors"
            title="Voice details"
          >
            <div class="flex items-center gap-2">
              <div class="relative">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <div class="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-30"></div>
              </div>
              <span class="text-xs font-medium text-green-400">Voice Connected</span>
            </div>
          </button>
          
          <!-- Disconnect Button -->
          <button
            @click="disconnectVoice"
            class="w-8 h-8 rounded flex items-center justify-center hover:bg-red-600 transition-colors text-text-muted hover:text-white"
            title="Disconnect"
          >
            <PhoneOff class="w-4 h-4" />
          </button>
        </div>

        <!-- Channel/Server Info -->
        <div class="px-2">
          <div class="text-sm font-medium text-text-default truncate">
            {{ channelName }} / {{ serverName }}
          </div>
        </div>
      </div>

      <!-- Voice Controls -->
      <div class="flex items-center gap-2 px-2">
        <!-- Turn on Camera Button -->
        <button
          @click="toggleCamera"
          :class="[
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors text-sm',
            isCameraOn ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-main-800 hover:bg-main-700 text-text-secondary'
          ]"
          :title="isCameraOn ? 'Turn off camera' : 'Turn on camera'"
        >
          <Video v-if="isCameraOn" class="w-4 h-4" />
          <VideoOff v-else class="w-4 h-4" />
          <span class="hidden sm:inline">{{ isCameraOn ? 'Camera On' : 'Camera' }}</span>
        </button>

        <!-- Screen Share Button -->
        <button
          @click="toggleScreenShare"
          :disabled="isScreenShareLoading"
          :class="[
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors text-sm',
            isScreenSharing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-main-800 hover:bg-main-700 text-text-secondary',
            isScreenShareLoading && 'opacity-50 cursor-not-allowed'
          ]"
          :title="isScreenSharing ? 'Stop screen share' : 'Share your screen'"
        >
          <Monitor v-if="isScreenSharing" class="w-4 h-4" />
          <MonitorSpeaker v-else class="w-4 h-4" />
          <span class="hidden sm:inline">{{ isScreenSharing ? 'Stop Share' : 'Screen' }}</span>
        </button>
      </div>

      <!-- Screen Share Quality Selector -->
      <div v-if="!isScreenSharing" class="px-2">
        <ScreenShareQualitySelector
          v-model="selectedQuality"
          v-model:include-audio="includeAudio"
          v-model:selected-f-p-s="selectedFPS"
          class="w-full"
        />
      </div>

      <!-- Active Screen Share Info -->
      <div
        v-if="isScreenSharing && activeQuality"
        class="px-2 py-2 bg-blue-900/30 rounded-lg"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Monitor class="w-4 h-4 text-blue-400" />
            <span class="text-sm text-blue-400">Sharing Screen</span>
          </div>
          <div class="text-xs text-blue-300">
            {{ activeQuality.label }} @ {{ activeQuality.frameRate }} FPS
            <span v-if="activeAudioEnabled" class="ml-1">🔊</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Connection Details Modal -->
    <VoiceConnectionDetails
      :is-open="showConnectionDetails"
      @close="showConnectionDetails = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  PhoneOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorSpeaker
} from 'lucide-vue-next';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import { livekitService } from '@/services/livekitService';
import { signalRService } from '@/services/signalrService';
import { useAuthStore } from '@/stores/auth';
import type { ScreenShareQualitySettings } from '@/services/livekitService';
import VoiceConnectionDetails from './VoiceConnectionDetails.vue';
import ScreenShareQualitySelector from './ScreenShareQualitySelector.vue';
import type { ScreenShareQuality } from './ScreenShareQualitySelector.vue';

const appStore = useAppStore();
const { addToast } = useToast();

// Voice connection state
const isConnectedToVoice = computed(() => appStore.currentVoiceChannelId !== null);
const showConnectionDetails = ref(false);

// Channel info
const channelName = computed(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId || !appStore.currentServer) return '';
  
  const channel = appStore.currentServer.channels.find(c => c.id === channelId);
  return channel?.name || 'Voice Channel';
});

const serverName = computed(() => {
  return appStore.currentServer?.name || 'Unknown Server';
});

// Camera state (mock for now)
const isCameraOn = ref(false);

// Screen share state
const isScreenSharing = ref(false);
const isScreenShareLoading = ref(false);
const activeQuality = ref<ScreenShareQuality | null>(null);
const activeAudioEnabled = ref(false);

// Screen share quality settings
const selectedQuality = ref<ScreenShareQuality>({
  value: '1080p',
  label: '1080p HD',
  resolution: '1920×1080',
  width: 1920,
  height: 1080,
  frameRate: 30
});
const includeAudio = ref(false);
const selectedFPS = ref(30);

// Voice actions
const disconnectVoice = async () => {
  const channelId = appStore.currentVoiceChannelId;
  if (channelId) {
    await appStore.leaveVoiceChannel(channelId);
    addToast({ message: 'Disconnected from voice channel', type: 'success' });
  }
};

const toggleCamera = () => {
  isCameraOn.value = !isCameraOn.value;
  addToast({ 
    message: isCameraOn.value ? 'Camera turned on' : 'Camera turned off', 
    type: 'success' 
  });
  // TODO: Implement actual camera functionality
};

// LiveKit connection management
const ensureLiveKitConnection = async (): Promise<boolean> => {
  // Check if already connected
  if (livekitService.isRoomConnected()) {
    console.log('✅ VoiceControlPanel: LiveKit already connected');
    return true;
  }

  // Try to connect if not connected
  if (!appStore.currentServer || !appStore.currentVoiceChannelId) {
    console.error('❌ VoiceControlPanel: Cannot connect to LiveKit - missing server or channel info');
    return false;
  }

  try {
    console.log('🔄 VoiceControlPanel: Attempting LiveKit connection...', {
      channelId: appStore.currentVoiceChannelId,
      serverId: appStore.currentServer.id
    });

    const authStore = useAuthStore();
    const username = authStore.user?.username || `user_${appStore.currentUserId}`;
    
    await livekitService.connectToRoom(appStore.currentVoiceChannelId, username);
    console.log('✅ VoiceControlPanel: LiveKit connected successfully');
    return true;
  } catch (error) {
    console.error('❌ VoiceControlPanel: Failed to connect to LiveKit:', error);
    return false;
  }
};

const toggleScreenShare = async () => {
  if (isScreenShareLoading.value) return;
  
  // Ensure LiveKit connection (try fallback connection if needed)
  const isConnected = await ensureLiveKitConnection();
  if (!isConnected) {
    addToast({ message: 'Failed to connect to voice channel for screen sharing', type: 'danger' });
    return;
  }
  
  // Get current server and channel info for SignalR notifications
  const currentServer = appStore.currentServer;
  const currentChannelId = appStore.currentVoiceChannelId;
  
  if (!currentServer || !currentChannelId) {
    addToast({ message: 'Voice channel information unavailable', type: 'danger' });
    return;
  }
  
  isScreenShareLoading.value = true;
  
  try {
    if (isScreenSharing.value) {
      console.log('🛑 VoiceControlPanel: Stopping screen share...');
      
      // 1. Stop screen share in LiveKit
      await livekitService.stopScreenShare();
      isScreenSharing.value = false;
      activeQuality.value = null;
      activeAudioEnabled.value = false;
      console.log('✅ VoiceControlPanel: LiveKit screen share stopped');
      
      // 2. Notify via SignalR that we stopped screen sharing
      await signalRService.stopScreenShare(currentServer.id.toString(), currentChannelId.toString());
      console.log('✅ VoiceControlPanel: SignalR stop notification sent');
      
      addToast({ message: 'Screen sharing stopped', type: 'success' });
    } else {
      console.log('🎬 VoiceControlPanel: Starting screen share...');
      
      // 1. Start screen share in LiveKit
      const qualitySettings: ScreenShareQualitySettings = {
        width: selectedQuality.value.width,
        height: selectedQuality.value.height,
        frameRate: selectedFPS.value,
        includeAudio: includeAudio.value
      };
      
      await livekitService.startScreenShare(qualitySettings);
      isScreenSharing.value = true;
      activeQuality.value = {
        ...selectedQuality.value,
        frameRate: selectedFPS.value
      };
      activeAudioEnabled.value = includeAudio.value;
      console.log('✅ VoiceControlPanel: LiveKit screen share started');
      
      // 2. Notify via SignalR that we started screen sharing
      await signalRService.startScreenShare(currentServer.id.toString(), currentChannelId.toString());
      console.log('✅ VoiceControlPanel: SignalR start notification sent');
      
      const audioText = includeAudio.value ? ' with audio' : '';
      addToast({ 
        message: `Screen sharing started at ${selectedQuality.value.label} @ ${selectedFPS.value} FPS${audioText}`, 
        type: 'success' 
      });
    }
  } catch (error: any) {
    console.error('VoiceControlPanel: Screen share error:', error);
    
    let errorMessage = 'Failed to toggle screen sharing';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.name === 'NotAllowedError') {
      errorMessage = 'Screen sharing permission denied';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No screen available for sharing';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Screen sharing cancelled by user';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Screen sharing not supported in this browser';
    }
    
    addToast({ message: errorMessage, type: 'danger' });
    
    // Reset state on error
    isScreenSharing.value = livekitService.isScreenSharing();
  } finally {
    isScreenShareLoading.value = false;
    console.log('🏁 VoiceControlPanel: Screen share loading state cleared');
  }
};

// Update screen sharing state periodically
const updateScreenShareState = () => {
  isScreenSharing.value = livekitService.isScreenSharing();
};

// Check screen share state every second
setInterval(updateScreenShareState, 1000);
</script>

<style scoped>
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
</style>