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
        <!-- Camera Split Button (main toggle + options) -->
        <div class="flex-1 relative camera-dropdown-anchor">
          <div class="flex">
            <!-- Main action -->
            <button
              @click="toggleCamera"
              :class="[
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 h-10 whitespace-nowrap rounded-l transition-colors text-sm',
                isCameraOn ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-main-800 hover:bg-main-700 text-text-secondary'
              ]"
              :title="isCameraOn ? 'Turn off camera' : 'Turn on camera'"
            >
              <Video v-if="isCameraOn" class="w-4 h-4" />
              <VideoOff v-else class="w-4 h-4" />
              <span class="hidden sm:inline">{{ isCameraOn ? 'Camera On' : 'Camera' }}</span>
            </button>
            <!-- Options toggle -->
            <button
              ref="cameraOptionsBtn"
              @click.stop="openCameraMenu"
              :class="[
                'w-8 h-10 flex items-center justify-center rounded-r border-l border-main-700 transition-colors',
                'bg-main-800 hover:bg-main-700 text-text-secondary'
              ]"
              title="Camera options"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Screen Share Split Button using Context Menu -->
        <div class="flex-1 relative screen-dropdown-anchor">
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
            <!-- Options toggle (opens ContextMenu) -->
            <button
              ref="screenOptionsBtn"
              @click.stop="openScreenShareMenu"
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
  <!-- Camera context menu -->
  <ContextMenu ref="cameraContextMenu" :items="cameraMenuItems" />
  <!-- Screen share context menu -->
  <ContextMenu ref="screenShareContextMenu" :items="screenShareMenuItems" />
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
// import type { ScreenShareQualitySettings } from '@/services/livekitService';
import VoiceConnectionDetails from './VoiceConnectionDetails.vue';
import { ChevronDown } from 'lucide-vue-next';
import { useScreenShareSettings } from '@/composables/useScreenShareSettings';
import { useCameraSettings } from '@/composables/useCameraSettings';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import type { MenuItem } from '@/components/ui/ContextMenu.vue';

const appStore = useAppStore();
const { addToast } = useToast();
const { resolutionOptions, fpsOptions, selectedQuality, selectedFPS, includeAudio, getCurrentSettings } = useScreenShareSettings();

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
// Camera options (shared)
const { devices: cameraDevices, selectedDeviceId, selectedQuality: selectedCamQuality, qualityOptions: cameraQualityOptions, ensureDevicesLoaded } = useCameraSettings();

// Camera context menu
const cameraContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const cameraMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [];
  items.push({ type: 'label', label: 'Camera' });

  // Device list
  items.push({ type: 'label', label: 'Device' });
  if ((cameraDevices.value || []).length > 0) {
    cameraDevices.value.forEach(d => {
      items.push({
        label: d.label || 'Camera',
        checked: selectedDeviceId.value === d.deviceId,
        action: () => { selectedDeviceId.value = d.deviceId; }
      });
    });
  } else {
    items.push({ label: 'No cameras found', disabled: true });
  }

  items.push({ type: 'separator' });

  // Quality options
  items.push({ type: 'label', label: 'Resolution' });
  cameraQualityOptions.forEach(q => {
    items.push({
      label: q.label,
      checked: selectedCamQuality.value.value === q.value,
      action: () => { selectedCamQuality.value = q; }
    });
  });

  return items;
});

const cameraOptionsBtn = ref<HTMLElement | null>(null);
const openCameraMenu = async () => {
  try { await ensureDevicesLoaded(); } catch {}
  const el = cameraOptionsBtn.value;
  if (el) {
    const rect = el.getBoundingClientRect();
    // Anchor to top-left and open above
    cameraContextMenu.value?.openAt(rect.left, rect.top, true, 10, el);
  }
};

// Screen share state (derived from store; with LiveKit fallback for local)
const isScreenSharing = computed(() => {
  const cid = appStore.currentVoiceChannelId;
  const uid = appStore.currentUserId;
  if (!cid || !uid) return false;
  const set = appStore.screenShares.get(cid) || new Set();
  return set.has(uid) || livekitService.isScreenSharing();
});
const isScreenShareLoading = ref(false);
const activeQuality = ref<{ label: string; frameRate: number } | null>(null);
const activeAudioEnabled = ref(false);

// Screen share context menu
const screenShareContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const screenOptionsBtn = ref<HTMLElement | null>(null);
const screenShareMenuItems = computed<MenuItem[]>(() => {
  if (isScreenSharing.value) {
    return [
      { type: 'label', label: 'Screen Share' },
      { label: 'Stop Screen Share', icon: Monitor, action: () => toggleScreenShare() }
    ];
  }
  const items: MenuItem[] = [];
  items.push({ type: 'label', label: 'Screen Share' });
  items.push({ label: 'Start Screen Share', icon: MonitorSpeaker, action: () => toggleScreenShare() });
  items.push({ type: 'separator' });
  // Resolution
  items.push({ type: 'label', label: 'Resolution' });
  resolutionOptions.forEach(opt => {
    items.push({
      label: `${opt.label} (${opt.resolution})`,
      checked: selectedQuality.value.value === opt.value,
      action: () => { selectedQuality.value = opt; }
    });
  });
  items.push({ type: 'separator' });
  // FPS
  items.push({ type: 'label', label: 'Frame Rate' });
  fpsOptions.forEach(fps => {
    items.push({
      label: `${fps.label} – ${fps.description}`,
      checked: selectedFPS.value === fps.value,
      action: () => { selectedFPS.value = fps.value; }
    });
  });
  items.push({ type: 'separator' });
  // Audio
  items.push({
    label: 'Include Audio',
    checked: includeAudio.value,
    action: () => {
      includeAudio.value = !includeAudio.value;
    }
  });
  return items;
});
const openScreenShareMenu = () => {
  const el = screenOptionsBtn.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  screenShareContextMenu.value?.openAt(rect.left, rect.top, true, 10, el);
};

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
  // no success toast for camera toggle
  // TODO: Implement actual camera functionality
};

// LiveKit connection management
const ensureLiveKitConnection = async (): Promise<boolean> => {
  // Check if already connected
  if (livekitService.isRoomConnected()) {
    
    return true;
  }

  // Try to connect if not connected
  if (!appStore.currentServer || !appStore.currentVoiceChannelId) {
    console.error('❌ VoiceControlPanel: Cannot connect to LiveKit - missing server or channel info');
    return false;
  }

  try {
    

    const authStore = useAuthStore();
    const username = authStore.user?.username || `user_${appStore.currentUserId}`;
    
    await livekitService.connectToRoom(appStore.currentVoiceChannelId, username);
    
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
      
      
      // 1. Stop screen share in LiveKit
      await livekitService.stopScreenShare();
      activeQuality.value = null;
      activeAudioEnabled.value = false;
      
      
      // 2. Update local store immediately and notify via SignalR
      try {
        if (appStore.currentVoiceChannelId && appStore.currentUserId)
          appStore.handleUserStoppedScreenShare(appStore.currentVoiceChannelId, appStore.currentUserId);
      } catch {}
      await signalRService.stopScreenShare(appStore.currentServer!.id.toString(), appStore.currentVoiceChannelId!.toString());
      // no success toast on stop
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
      
      const settings = getCurrentSettings();
      await livekitService.startScreenShare(settings);
      activeQuality.value = { label: selectedQuality.value.label, frameRate: selectedFPS.value };
      activeAudioEnabled.value = includeAudio.value;

      // Update local store immediately and notify via SignalR
      try { appStore.handleUserStartedScreenShare(currentChannelId, appStore.currentUserId!); } catch {}
      await signalRService.startScreenShare(currentServer.id.toString(), currentChannelId.toString());
      // no success toast on start
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
    // isScreenSharing.value = livekitService.isScreenSharing();
  } finally {
    isScreenShareLoading.value = false;
    
  }
};

// No inline dropdown; using ContextMenu instead

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
