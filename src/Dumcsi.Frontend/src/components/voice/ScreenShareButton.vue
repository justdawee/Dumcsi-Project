<template>
  <div class="flex items-center gap-2">
    <ScreenShareQualitySelector
      v-if="!isScreenSharing"
      v-model="selectedQuality"
      v-model:include-audio="includeAudio"
      v-model:selected-f-p-s="selectedFPS"
    />
    
    <button 
      @click="toggleScreenShare"
      :disabled="isLoading || !isConnected"
      :class="[
        'flex items-center justify-center p-2 rounded-lg transition-colors',
        isScreenSharing 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-gray-600 hover:bg-gray-500 text-gray-200',
        (isLoading || !isConnected) && 'opacity-50 cursor-not-allowed'
      ]"
      :title="buttonTitle"
    >
      <svg 
        v-if="!isLoading"
        :class="['w-5 h-5', isScreenSharing && 'animate-pulse']" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path v-if="!isScreenSharing" d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
        <path v-else d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6zm8 2l-4 4h2.5v3h3v-3H16l-4-4z"/>
      </svg>
      <svg 
        v-else
        class="w-5 h-5 animate-spin" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </button>

    <!-- Quality indicator when screen sharing is active -->
    <div
      v-if="isScreenSharing && activeQuality"
      class="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded-md"
    >
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
      </svg>
      <span>{{ activeQuality.label }} @ {{ activeQuality.frameRate }} FPS</span>
      <span v-if="activeAudioEnabled" class="ml-1">🔊</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { livekitService } from '@/services/livekitService';
import type { ScreenShareQualitySettings } from '@/services/livekitService';
import { useToast } from '@/composables/useToast';
import ScreenShareQualitySelector from './ScreenShareQualitySelector.vue';
import type { ScreenShareQuality } from './ScreenShareQualitySelector.vue';

const { addToast } = useToast();

const isLoading = ref(false);
const isScreenSharing = ref(false);
const isConnected = ref(false);

// Quality settings
const selectedQuality = ref<ScreenShareQuality>({
  value: '1080p',
  label: '1080p HD',
  resolution: '1920×1080',
  width: 1920,
  height: 1080,
  frameRate: 30
});

const includeAudio = ref(false);
const selectedFPS = ref(30); // Default to 30 FPS

// Track active quality and audio settings when sharing
const activeQuality = ref<ScreenShareQuality | null>(null);
const activeAudioEnabled = ref(false);

// Check connection status
const checkConnectionStatus = () => {
  isConnected.value = livekitService.isRoomConnected();
  isScreenSharing.value = livekitService.isScreenSharing();
};

// Initialize connection status
checkConnectionStatus();

const buttonTitle = computed(() => {
  if (!isConnected.value) return 'Not connected to voice channel';
  if (isLoading.value) return 'Loading...';
  return isScreenSharing.value ? 'Stop screen sharing' : 'Start screen sharing';
});

const toggleScreenShare = async () => {
  if (isLoading.value || !isConnected.value) return;

  isLoading.value = true;
  
  try {
    if (isScreenSharing.value) {
      await livekitService.stopScreenShare();
      isScreenSharing.value = false;
      activeQuality.value = null;
      activeAudioEnabled.value = false;
      addToast({ message: 'Screen sharing stopped', type: 'success' });
    } else {
      // Create quality settings from selected options
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
      
      const audioText = includeAudio.value ? ' with audio' : '';
      addToast({ 
        message: `Screen sharing started at ${selectedQuality.value.label} @ ${selectedFPS.value} FPS${audioText}`, 
        type: 'success' 
      });
    }
  } catch (error: any) {
    console.error('Screen share error:', error);
    
    let errorMessage = 'Failed to toggle screen sharing';
    
    // Use the error message from the service if available
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
    isLoading.value = false;
  }
};

// Update connection status periodically
const updateInterval = setInterval(checkConnectionStatus, 1000);

// Cleanup on unmount
import { onUnmounted } from 'vue';
onUnmounted(() => {
  clearInterval(updateInterval);
});
</script>