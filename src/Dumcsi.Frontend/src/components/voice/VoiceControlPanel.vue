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
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 h-10 rounded transition-colors text-sm',
            isCameraOn ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-main-800 hover:bg-main-700 text-text-secondary'
          ]"
          :title="isCameraOn ? 'Turn off camera' : 'Turn on camera'"
        >
          <Video v-if="isCameraOn" class="w-4 h-4" />
          <VideoOff v-else class="w-4 h-4" />
          <span class="hidden sm:inline">{{ isCameraOn ? 'Camera On' : 'Camera' }}</span>
        </button>

        <!-- Screen Share Split Button with Options Dropdown -->
        <div ref="qualityAnchor" class="flex-1 relative quality-dropdown-anchor">
          <div class="flex">
            <!-- Main action -->
            <button
              @click="toggleScreenShare"
              :disabled="isScreenShareLoading"
              :class="[
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 h-10 whitespace-nowrap rounded-l transition-colors text-sm',
                isScreenSharing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-main-800 hover:bg-main-700 text-text-secondary',
                isScreenShareLoading && 'opacity-50 cursor-not-allowed'
              ]"
              :title="isScreenSharing ? 'Stop screen share' : 'Share your screen'"
            >
              <Monitor v-if="isScreenSharing" class="w-4 h-4" />
              <MonitorSpeaker v-else class="w-4 h-4" />
              <span class="hidden sm:inline">{{ isScreenSharing ? 'Stop Share' : 'Screen' }}</span>
            </button>
            <!-- Options toggle -->
            <button
              @click.stop="qualityOpen = !qualityOpen"
              :disabled="isScreenSharing || isScreenShareLoading"
              :class="[
                'w-8 h-10 flex items-center justify-center rounded-r border-l border-main-700 transition-colors',
                (!isScreenSharing && !isScreenShareLoading) ? 'bg-main-800 hover:bg-main-700 text-text-secondary' : 'bg-main-900 text-text-tertiary opacity-60'
              ]"
              title="Screen share options"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>

          <!-- Options dropdown (teleported to body, opens upward) -->
          <teleport to="body">
            <div
              v-if="qualityOpen && !isScreenSharing"
              class="fixed z-[10000] bg-main-900 border border-border-default rounded-lg shadow-lg p-3 transform -translate-y-full"
              :style="dropdownStyle"
              @click.stop
            >
            <!-- Resolution -->
            <div class="mb-3">
              <div class="text-xs font-medium text-text-secondary mb-2">Resolution</div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="opt in resolutionOptions"
                  :key="opt.value"
                  @click="selectedQuality = opt"
                  :class="[
                    'px-3 py-2 rounded border text-sm text-left',
                    selectedQuality.value === opt.value
                      ? 'border-primary bg-primary/20 text-text-default'
                      : 'border-border-default bg-main-800 text-text-secondary hover:bg-main-700'
                  ]"
                >
                  <div class="font-medium">{{ opt.label }}</div>
                  <div class="text-xs opacity-75">{{ opt.resolution }}</div>
                </button>
              </div>
            </div>

            <!-- FPS -->
            <div class="mb-3">
              <div class="text-xs font-medium text-text-secondary mb-2">Frame Rate</div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="fps in fpsOptions"
                  :key="fps.value"
                  @click="selectedFPS = fps.value"
                  :class="[
                    'px-3 py-2 rounded border text-sm text-left',
                    selectedFPS === fps.value
                      ? 'border-primary bg-primary/20 text-text-default'
                      : 'border-border-default bg-main-800 text-text-secondary hover:bg-main-700'
                  ]"
                >
                  <div class="font-medium">{{ fps.label }}</div>
                  <div class="text-xs opacity-75">{{ fps.description }}</div>
                </button>
              </div>
            </div>

            <!-- Audio -->
            <div>
              <label class="flex items-center gap-2 text-sm text-text-default">
                <input type="checkbox" v-model="includeAudio" class="rounded border-border-default bg-main-800 text-primary" />
                Include system/tab audio (if supported)
              </label>
            </div>
            </div>
          </teleport>
        </div>
      </div>

      <!-- Options are available in dropdown on split button -->

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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
import { ChevronDown } from 'lucide-vue-next';

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

// Screen share state (derived from store; stays in sync across app)
const isScreenSharing = computed(() => {
  const cid = appStore.currentVoiceChannelId;
  const uid = appStore.currentUserId;
  if (!cid || !uid) return false;
  const set = appStore.screenShares.get(cid) || new Set();
  return set.has(uid);
});
const isScreenShareLoading = ref(false);
const activeQuality = ref<{ label: string; frameRate: number } | null>(null);
const activeAudioEnabled = ref(false);

// Screen share quality settings
// Quality dropdown state and selections
const qualityOpen = ref(false);
const resolutionOptions = [
  { value: '4k', label: '4K Ultra', resolution: '3840×2160', width: 3840, height: 2160 },
  { value: '1080p', label: '1080p HD', resolution: '1920×1080', width: 1920, height: 1080 },
  { value: '720p', label: '720p', resolution: '1280×720', width: 1280, height: 720 },
  { value: '480p', label: '480p', resolution: '854×480', width: 854, height: 480 },
];
const fpsOptions = [
  { value: 15, label: '15 FPS', description: 'Low motion (saves bandwidth)' },
  { value: 30, label: '30 FPS', description: 'Standard (recommended)' },
  { value: 60, label: '60 FPS', description: 'Smooth motion (higher bandwidth)' },
];
const selectedQuality = ref(resolutionOptions[1]);
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
  
  try {
    if (isScreenSharing.value) {
      console.log('🛑 VoiceControlPanel: Stopping screen share...');
      
      // 1. Stop screen share in LiveKit
      await livekitService.stopScreenShare();
      activeQuality.value = null;
      activeAudioEnabled.value = false;
      console.log('✅ VoiceControlPanel: LiveKit screen share stopped');
      
      // 2. Notify via SignalR that we stopped screen sharing
      await signalRService.stopScreenShare(currentServer.id.toString(), currentChannelId.toString());
      console.log('✅ VoiceControlPanel: SignalR stop notification sent');
      
      addToast({ message: 'Screen sharing stopped', type: 'success' });
    } else {
      // Start screen share immediately with current selections
      const isConnected = await ensureLiveKitConnection();
      if (!isConnected) {
        addToast({ message: 'Failed to connect to voice channel for screen sharing', type: 'danger' });
        return;
      }

      const currentServer = appStore.currentServer;
      const currentChannelId = appStore.currentVoiceChannelId;
      if (!currentServer || !currentChannelId) {
        addToast({ message: 'Voice channel information unavailable', type: 'danger' });
        return;
      }

      isScreenShareLoading.value = true;
      console.log('🎬 VoiceControlPanel: Starting screen share...');
      await livekitService.startScreenShare({
        width: selectedQuality.value.width,
        height: selectedQuality.value.height,
        frameRate: selectedFPS.value,
        includeAudio: includeAudio.value,
      });
      activeQuality.value = { label: selectedQuality.value.label, frameRate: selectedFPS.value };
      activeAudioEnabled.value = includeAudio.value;

      await signalRService.startScreenShare(currentServer.id.toString(), currentChannelId.toString());
      const audioText = includeAudio.value ? ' with audio' : '';
      addToast({ message: `Screen sharing started at ${selectedQuality.value.label} @ ${selectedFPS.value} FPS${audioText}`, type: 'success' });
      qualityOpen.value = false;
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

// Anchor and positioning for teleported dropdown
const qualityAnchor = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const updateDropdownPosition = () => {
  const el = qualityAnchor.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  // Desired max width and clamp to viewport
  let width = Math.min(320, vw - 2 * margin);
  // Decide whether to anchor to right or left edge to avoid overflow
  const wouldOverflowLeftWithRight = (rect.right - width) < margin;
  const useRight = !wouldOverflowLeftWithRight;
  const style: Record<string, string> = {
    top: `${rect.top - 8}px`,
    width: `${width}px`,
  };
  if (useRight) {
    // If still close to left edge, reduce width further
    if (rect.right - width < margin) {
      width = Math.max(180, rect.right - margin);
      style.width = `${Math.min(width, vw - 2 * margin)}px`;
    }
    style.right = `${Math.max(margin, vw - rect.right)}px`;
    delete style.left;
  } else {
    // Anchor to left and clamp width to fit right edge
    if (rect.left + width > vw - margin) {
      width = Math.max(180, vw - rect.left - margin);
      style.width = `${width}px`;
    }
    style.left = `${Math.max(margin, rect.left)}px`;
    delete style.right;
  }
  dropdownStyle.value = style;
};

watch(qualityOpen, (open) => {
  if (open) {
    updateDropdownPosition();
  }
});

// Close quality dropdown on outside click
const onDocClick = (e: MouseEvent) => {
  const target = e.target as Element | null;
  if (!target) return;
  if (!target.closest('.quality-dropdown-anchor')) {
    qualityOpen.value = false;
  }
};

const onResize = () => { if (qualityOpen.value) updateDropdownPosition(); };

onMounted(() => {
  document.addEventListener('click', onDocClick);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
});

// isScreenSharing is derived; no polling needed
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
