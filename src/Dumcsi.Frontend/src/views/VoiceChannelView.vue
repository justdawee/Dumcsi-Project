<template>
  <div class="voice-channel-view flex h-full bg-main-950">

    <!-- Main Voice View -->
    <div class="flex-1 flex flex-col relative">
      <!-- Voice Channel Header -->
      <div class="p-4 border-b border-border-default bg-main-900">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              @click="$router.go(-1)"
              class="w-8 h-8 rounded hover:bg-main-800 flex items-center justify-center transition-colors"
              title="Go back"
            >
              <ArrowLeft class="w-4 h-4 text-text-muted" />
            </button>
            
            <div class="flex items-center gap-2">
              <Volume2 class="w-5 h-5 text-text-muted" />
              <h1 class="text-xl font-semibold text-text-default">{{ voiceChannelName }}</h1>
              <div class="flex items-center gap-1 ml-2">
                <Users class="w-4 h-4 text-text-muted" />
                <span class="text-sm text-text-muted">{{ participantCount }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Voice Settings Button -->
            <button
              @click="showVoiceSettings = true"
              class="w-8 h-8 rounded hover:bg-main-800 flex items-center justify-center transition-colors"
              title="Voice settings"
            >
              <Settings class="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>
      </div>

      <!-- Video/Screenshare Grid -->
      <div class="flex-1 p-4 overflow-hidden">
        <div v-if="participants.length === 0" class="h-full flex items-center justify-center">
          <div class="text-center">
            <Volume2 class="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <h3 class="text-lg font-medium text-text-default mb-2">No one else is here</h3>
            <p class="text-text-muted">Invite someone to start a conversation</p>
          </div>
        </div>

        <div v-else class="h-full">
          <!-- Main Screen Share View -->
          <div v-if="mainScreenShare" class="h-full flex flex-col">
            <div class="flex-1 bg-black rounded-lg overflow-hidden mb-4 relative">
              <video 
                ref="mainVideo"
                :srcObject="mainScreenShare.stream"
                autoplay
                playsinline
                muted
                class="w-full h-full object-contain"
              />
              <div class="absolute bottom-4 left-4 bg-black/70 rounded px-3 py-1">
                <span class="text-white text-sm font-medium">{{ mainScreenShare.user.username }}</span>
                <span class="text-white/70 text-xs ml-1">is sharing their screen</span>
              </div>
            </div>
            
            <!-- Other Participants Strip -->
            <div class="flex gap-2 max-h-24">
              <div 
                v-for="participant in otherParticipants" 
                :key="participant.id"
                @click="selectMainView(participant)"
                class="w-32 h-20 bg-main-800 rounded cursor-pointer hover:ring-2 hover:ring-primary transition-all relative overflow-hidden"
              >
                <video 
                  v-if="participant.videoStream"
                  :srcObject="participant.videoStream"
                  autoplay
                  playsinline
                  muted
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <UserAvatar :user-id="participant.id" :username="participant.username" :avatar-url="participant.avatar" :size="32" />
                </div>
                <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1">
                  <span class="text-white text-xs">{{ participant.username }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Grid View (when no main screen share) -->
          <div v-else class="h-full grid gap-4" :class="gridClasses">
            <div 
              v-for="participant in participants" 
              :key="participant.id"
              @click="selectMainView(participant)"
              class="bg-main-800 rounded-lg overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            >
              <video 
                v-if="participant.videoStream || participant.screenShareStream"
                :srcObject="participant.videoStream || participant.screenShareStream"
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <UserAvatar :user-id="participant.id" :username="participant.username" :avatar-url="participant.avatar" :size="64" />
              </div>
              
              <!-- User Info Overlay -->
              <div class="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1">
                <div class="flex items-center gap-2">
                  <span class="text-white text-sm font-medium">{{ participant.username }}</span>
                  <MicOff v-if="participant.isMuted" class="w-3 h-3 text-red-400" />
                  <VolumeX v-else-if="participant.isDeafened" class="w-3 h-3 text-red-400" />
                </div>
              </div>

              <!-- Screen Share Indicator -->
              <div v-if="participant.screenShareStream" class="absolute top-2 right-2 bg-blue-600 rounded px-2 py-1">
                <Monitor class="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto-hiding Voice Controls -->
      <div 
        class="voice-controls absolute bottom-0 left-0 right-0 bg-main-900/95 backdrop-blur-sm border-t border-border-default transition-transform duration-300"
        :class="{
          'translate-y-full': !showControls && !controlsLocked,
          'translate-y-0': showControls || controlsLocked
        }"
        @mouseenter="showControls = true"
        @mouseleave="showControls = false"
      >
        <div class="p-4">
          <div class="flex items-center justify-center gap-4">
            <!-- Mute Button -->
            <button
              @click="toggleMute"
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                appStore.selfMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-main-700 hover:bg-main-600'
              ]"
              :title="appStore.selfMuted ? 'Unmute' : 'Mute'"
            >
              <Mic v-if="!appStore.selfMuted" class="w-5 h-5 text-white" />
              <MicOff v-else class="w-5 h-5 text-white" />
            </button>

            <!-- Deafen Button -->
            <button
              @click="toggleDeafen"
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                appStore.selfDeafened ? 'bg-red-600 hover:bg-red-700' : 'bg-main-700 hover:bg-main-600'
              ]"
              :title="appStore.selfDeafened ? 'Undeafen' : 'Deafen'"
            >
              <Volume2 v-if="!appStore.selfDeafened" class="w-5 h-5 text-white" />
              <VolumeX v-else class="w-5 h-5 text-white" />
            </button>

            <!-- Camera Button -->
            <button
              @click="toggleCamera"
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                isCameraOn ? 'bg-green-600 hover:bg-green-700' : 'bg-main-700 hover:bg-main-600'
              ]"
              :title="isCameraOn ? 'Turn off camera' : 'Turn on camera'"
            >
              <Video v-if="isCameraOn" class="w-5 h-5 text-white" />
              <VideoOff v-else class="w-5 h-5 text-white" />
            </button>

            <!-- Screen Share Button -->
            <button
              @click="toggleScreenShare"
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-main-700 hover:bg-main-600'
              ]"
              :title="isScreenSharing ? 'Stop screen share' : 'Share screen'"
              :disabled="isScreenShareLoading"
            >
              <Monitor v-if="isScreenSharing" class="w-5 h-5 text-white" />
              <MonitorSpeaker v-else class="w-5 h-5 text-white" />
            </button>

            <!-- Disconnect Button -->
            <button
              @click="disconnectVoice"
              class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
              title="Disconnect"
            >
              <PhoneOff class="w-5 h-5 text-white" />
            </button>

            <!-- Lock Controls Button -->
            <button
              @click="controlsLocked = !controlsLocked"
              :class="[
                'w-8 h-8 rounded flex items-center justify-center transition-colors ml-4',
                controlsLocked ? 'bg-primary' : 'hover:bg-main-700'
              ]"
              :title="controlsLocked ? 'Unlock controls' : 'Lock controls visible'"
            >
              <Lock v-if="controlsLocked" class="w-4 h-4 text-white" />
              <Unlock v-else class="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Voice Connection Details Modal -->
    <VoiceConnectionDetails
      :is-open="showVoiceSettings"
      @close="showVoiceSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import { livekitService } from '@/services/livekitService';
import {
  Volume2, Users, ArrowLeft, Settings,
  Mic, MicOff, Video, VideoOff, Monitor, MonitorSpeaker, 
  PhoneOff, VolumeX, Lock, Unlock
} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import VoiceConnectionDetails from '@/components/voice/VoiceConnectionDetails.vue';

interface VoiceParticipant {
  id: number;
  username: string;
  avatar?: string;
  isMuted: boolean;
  isDeafened: boolean;
  videoStream?: MediaStream;
  screenShareStream?: MediaStream;
}

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { addToast } = useToast();

// Props from route params
const channelId = computed(() => parseInt(route.params.channelId as string));
const serverId = computed(() => parseInt(route.params.serverId as string));
const focusUserId = computed(() => route.query.focusUser ? parseInt(route.query.focusUser as string) : null);

// Voice channel info
const voiceChannelName = computed(() => {
  if (!appStore.currentServer || !channelId.value) return 'Voice Channel';
  const channel = appStore.currentServer.channels.find(c => c.id === channelId.value);
  return channel?.name || 'Voice Channel';
});


// UI State
const showVoiceSettings = ref(false);
const showControls = ref(true);
const controlsLocked = ref(false);

// Voice controls state
const isCameraOn = ref(false);
const isScreenSharing = ref(false);
const isScreenShareLoading = ref(false);

// Participants (mock data for now)
const participants = ref<VoiceParticipant[]>([]);

const participantCount = computed(() => participants.value.length + 1); // +1 for current user

// Video display logic
const mainScreenShare = computed(() => {
  // Prioritize selected participant if they have video/screenshare
  if (selectedParticipant.value && (selectedParticipant.value.screenShareStream || selectedParticipant.value.videoStream)) {
    return {
      ...selectedParticipant.value,
      stream: selectedParticipant.value.screenShareStream || selectedParticipant.value.videoStream,
      user: selectedParticipant.value
    };
  }
  
  // Otherwise, show first participant with screenshare
  const screenShareParticipant = participants.value.find(p => p.screenShareStream);
  if (screenShareParticipant) {
    return {
      ...screenShareParticipant,
      stream: screenShareParticipant.screenShareStream,
      user: screenShareParticipant
    };
  }
  
  return null;
});

const otherParticipants = computed(() => {
  if (!mainScreenShare.value) return [];
  return participants.value.filter(p => p.id !== mainScreenShare.value?.id);
});

// Grid layout classes based on participant count
const gridClasses = computed(() => {
  const count = participants.value.length;
  if (count <= 1) return 'grid-cols-1';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
});

// Methods
const toggleMute = async () => {
  appStore.toggleSelfMute();
};

const toggleDeafen = async () => {
  appStore.toggleSelfDeafen();
};

const toggleCamera = () => {
  isCameraOn.value = !isCameraOn.value;
  addToast({ 
    message: isCameraOn.value ? 'Camera turned on' : 'Camera turned off', 
    type: 'success' 
  });
  // TODO: Implement actual camera functionality
};

const toggleScreenShare = async () => {
  if (isScreenShareLoading.value) return;
  
  // Check if we're connected to the LiveKit room
  if (!livekitService.isRoomConnected()) {
    addToast({ message: 'Not connected to voice room', type: 'danger' });
    return;
  }
  
  isScreenShareLoading.value = true;
  
  try {
    if (isScreenSharing.value) {
      await livekitService.stopScreenShare();
      isScreenSharing.value = false;
      addToast({ message: 'Screen sharing stopped', type: 'success' });
    } else {
      const qualitySettings = {
        width: 1920,
        height: 1080,
        frameRate: 30,
        includeAudio: false
      };
      
      await livekitService.startScreenShare(qualitySettings);
      isScreenSharing.value = true;
      addToast({ message: 'Screen sharing started', type: 'success' });
    }
  } catch (error: any) {
    console.error('Screen share error:', error);
    addToast({ message: error.message || 'Failed to toggle screen sharing', type: 'danger' });
    isScreenSharing.value = livekitService.isScreenSharing();
  } finally {
    isScreenShareLoading.value = false;
  }
};

const disconnectVoice = async () => {
  if (appStore.currentVoiceChannelId) {
    await appStore.leaveVoiceChannel(appStore.currentVoiceChannelId);
    addToast({ message: 'Disconnected from voice channel', type: 'success' });
    router.go(-1); // Go back to previous view
  }
};

// Selected participant for main view
const selectedParticipant = ref<VoiceParticipant | null>(null);

const selectMainView = (participant: VoiceParticipant) => {
  selectedParticipant.value = participant;
};

// Auto-focus on user if specified in query params
const autoFocusUser = () => {
  if (focusUserId.value && participants.value.length > 0) {
    const targetParticipant = participants.value.find(p => p.id === focusUserId.value);
    if (targetParticipant) {
      selectMainView(targetParticipant);
    }
  }
};

// Auto-hide controls timer
let hideControlsTimer: NodeJS.Timeout;

const resetHideTimer = () => {
  if (controlsLocked.value) return;
  
  clearTimeout(hideControlsTimer);
  showControls.value = true;
  hideControlsTimer = setTimeout(() => {
    if (!controlsLocked.value) {
      showControls.value = false;
    }
  }, 3000);
};

// Mouse movement detection for auto-hiding controls
const handleMouseMove = () => {
  resetHideTimer();
};

onMounted(async () => {
  // Ensure we're connected to the voice channel
  if (!appStore.currentVoiceChannelId || appStore.currentVoiceChannelId !== channelId.value) {
    router.go(-1);
    return;
  }

  // Wait a moment for LiveKit connection to establish if needed
  await new Promise(resolve => setTimeout(resolve, 500));

  // Start auto-hide timer
  resetHideTimer();
  
  // Listen for mouse movement
  document.addEventListener('mousemove', handleMouseMove);
  
  // Update screen sharing state
  isScreenSharing.value = livekitService.isScreenSharing();
  
  // Mock participants for demonstration
  participants.value = [
    {
      id: 2,
      username: 'User2',
      isMuted: false,
      isDeafened: false,
    },
    {
      id: 3,
      username: 'User3', 
      isMuted: true,
      isDeafened: false,
    }
  ];

  // Auto-focus on user if specified
  autoFocusUser();
});

onUnmounted(() => {
  clearTimeout(hideControlsTimer);
  document.removeEventListener('mousemove', handleMouseMove);
});
</script>

<style scoped>
.voice-controls {
  backdrop-filter: blur(8px);
}

.grid {
  grid-template-rows: repeat(auto-fit, minmax(200px, 1fr));
}

@media (max-width: 768px) {
  .grid {
    grid-template-rows: repeat(auto-fit, minmax(150px, 1fr));
  }
}
</style>