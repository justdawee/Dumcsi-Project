<template>
  <div ref="voiceChannelViewRef" class="voice-channel-view flex h-full bg-bg-base">

    <!-- Main Voice View -->
    <div class="flex-1 flex flex-col relative">
      <!-- Voice Channel Header -->
      <div class="p-4 border-b h-14 border-border-default bg-bg-base">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <Volume2 class="w-5 h-5 text-text-muted" />
              <h1 class="text-lg font-semibold text-text-default">{{ voiceChannelName }}</h1>
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
                @loadedmetadata="(e: Event) => (e.target as HTMLVideoElement)?.play()"
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
                  @loadedmetadata="(e: Event) => (e.target as HTMLVideoElement)?.play()"
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
          <div v-else class="h-full p-2">
            <div :class="gridLayoutClasses">
              <div 
                v-for="participant in participants" 
                :key="participant.id"
                @click="selectMainView(participant)"
                :class="participantClasses"
                class="bg-main-800 rounded-lg overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              >
              <video 
                v-if="participant.videoStream || participant.screenShareStream"
                :srcObject="participant.videoStream || participant.screenShareStream"
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover"
                @loadedmetadata="(e: Event) => (e.target as HTMLVideoElement)?.play()"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <UserAvatar :user-id="participant.id" :username="participant.username" :avatar-url="participant.avatar" :size="64" />
              </div>
              
              <!-- User Info Overlay -->
              <div class="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1">
                <div class="flex items-center gap-2">
                  <span class="text-white text-sm font-medium">
                    {{ participant.username }}
                    <span v-if="participant.isCurrentUser" class="text-green-400 font-bold">(You)</span>
                  </span>
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
      </div>

      <!-- Auto-hiding Voice Controls -->
      <div 
        class="voice-controls absolute bottom-0 left-0 right-0 transition-transform duration-300"
        :class="{
          'translate-y-full': !showControls && !controlsLocked,
          'translate-y-0': showControls || controlsLocked
        }"
        @mouseenter="handleControlsMouseEnter"
        @mouseleave="handleControlsMouseLeave"
      >
        <div class="p-6">
          <div class="flex items-center justify-center gap-6">
            <!-- Primary Controls Group (Mic + Deafen) -->
            <div class="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
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
            </div>

            <!-- Camera + Screen Share Group -->
            <div class="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
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
            </div>

            <!-- Disconnect Button (Individual) -->
            <div class="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
              <button
                @click="disconnectVoice"
                class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
                title="Disconnect"
              >
                <PhoneOff class="w-5 h-5 text-white" />
              </button>
            </div>

            <!-- Lock Controls Button -->
            <div class="bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 ml-4">
              <button
                @click="controlsLocked = !controlsLocked"
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
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
    </div>

    <!-- Voice Connection Details Modal -->
    <VoiceConnectionDetails
      :is-open="showVoiceSettings"
      @close="showVoiceSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {livekitService} from '@/services/livekitService';
import {webrtcService} from '@/services/webrtcService';
import {useAuthStore} from '@/stores/auth';
import {
  Lock,
  Mic,
  MicOff,
  Monitor,
  MonitorSpeaker,
  PhoneOff,
  Settings,
  Unlock,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX
} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import VoiceConnectionDetails from '@/components/voice/VoiceConnectionDetails.vue';

interface VoiceParticipant {
  id: number;
  username: string;
  avatar?: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing?: boolean;
  videoStream?: MediaStream;
  screenShareStream?: MediaStream;
  user: {
    id: number;
    username: string;
    avatar?: string | null;
  };
}

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { addToast } = useToast();

// Props from route params
const channelId = computed(() => parseInt(route.params.channelId as string));
// Note: serverId is available from route params but not currently used in this component
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


// Participants from SignalR voice channel data
const participants = computed(() => {
  if (!channelId.value) return [];
  
  const users = appStore.voiceChannelUsers.get(channelId.value) || [];
  const currentUserId = appStore.currentUserId;
  const screenShareUsers = appStore.screenShares.get(channelId.value) || new Set();
  
  console.log('🎯 VoiceChannelView participants:', {
    currentUser: currentUserId,
    allUsers: users.length,
    usernames: users.map(u => u.username),
    screenSharing: Array.from(screenShareUsers)
  });
  
  // Map users to participants
  return users.map(user => ({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    isMuted: user.id === currentUserId ? appStore.selfMuted : false,
    isDeafened: user.id === currentUserId ? appStore.selfDeafened : false,
    isScreenSharing: screenShareUsers.has(user.id),
    videoStream: undefined as MediaStream | undefined,
    screenShareStream: undefined as MediaStream | undefined,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar
    },
    isCurrentUser: user.id === currentUserId
  }));
});

const participantCount = computed(() => participants.value.length); // All participants including current user

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

const gridLayoutClasses = computed(() => {
  const base = 'h-full grid content-center justify-items-center gap-2';
  const count = participants.value.length;

  if (count <= 1)  return `${base} grid-cols-1`;
  if (count <= 2)  return `${base} grid-cols-2`;
  if (count <= 4)  return `${base} grid-cols-2`;
  if (count <= 6)  return `${base} grid-cols-3`;
  if (count <= 9)  return `${base} grid-cols-3`;
  if (count <= 12) return `${base} grid-cols-4`;
  return `${base} grid-cols-4`;
});

const participantClasses = computed(() => {
  const count = participants.value.length;

  // Smaller, centered single-tile
  if (count === 1) {
    return 'grid-cell w-full mx-auto max-w-[clamp(320px,70vw,800px)]';
  }

  // Normal tiles fill their grid tracks
  return 'grid-cell w-full';
});

// Methods
const toggleMute = async () => {
  appStore.toggleSelfMute();
  // Update WebRTC service (used for SignalR voice channels)
  webrtcService.setMuted(appStore.selfMuted);
};

const toggleDeafen = async () => {
  appStore.toggleSelfDeafen();
  // When deafened, also mute the microphone in WebRTC (SignalR voice)
  webrtcService.setMuted(appStore.selfDeafened || appStore.selfMuted);
};

const toggleCamera = async () => {
  // Connect to LiveKit if not connected (only for video/screen sharing)
  if (!livekitService.isRoomConnected()) {
    try {
      await connectToLiveKit();
    } catch (error: any) {
      console.error('Failed to connect to LiveKit for camera:', error);
      addToast({ message: 'Failed to connect for video features', type: 'danger' });
      return;
    }
  }
  
  try {
    const localParticipant = livekitService.getLocalParticipant();
    if (!localParticipant) return;
    
    const isCameraEnabled = localParticipant.isCameraEnabled;
    
    // Toggle camera
    await localParticipant.setCameraEnabled(!isCameraEnabled);
    
    isCameraOn.value = !isCameraEnabled;
    addToast({ 
      message: isCameraOn.value ? 'Camera turned on' : 'Camera turned off', 
      type: 'success' 
    });
  } catch (error: any) {
    console.error('Camera toggle error:', error);
    addToast({ 
      message: error.message || 'Failed to toggle camera', 
      type: 'danger' 
    });
  }
};

const toggleScreenShare = async () => {
  if (isScreenShareLoading.value) return;
  
  // Connect to LiveKit if not connected (only for video/screen sharing)
  if (!livekitService.isRoomConnected()) {
    try {
      await connectToLiveKit();
    } catch (error: any) {
      console.error('Failed to connect to LiveKit for screen share:', error);
      addToast({ message: 'Failed to connect for screen sharing', type: 'danger' });
      return;
    }
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
    const serverId = route.params.serverId;
    await appStore.leaveVoiceChannel(appStore.currentVoiceChannelId);
    addToast({ message: 'Disconnected from voice channel', type: 'success' });

    setTimeout(() => {
      router.push(`/servers/${serverId}`);
    }, 200);
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
let hideControlsTimer: number;

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

// Mouse movement detection for auto-hiding controls (only within VoiceChannelView)
const voiceChannelViewRef = ref<HTMLElement | null>(null);
const currentMouseX = ref(0);
const currentMouseY = ref(0);

// Check if mouse is currently within VoiceChannelView
const isMouseInVoiceView = () => {
  if (!voiceChannelViewRef.value) return false;
  
  const rect = voiceChannelViewRef.value.getBoundingClientRect();
  return (
    currentMouseX.value >= rect.left &&
    currentMouseX.value <= rect.right &&
    currentMouseY.value >= rect.top &&
    currentMouseY.value <= rect.bottom
  );
};

const handleMouseMove = (event: MouseEvent) => {
  // Update current mouse position
  currentMouseX.value = event.clientX;
  currentMouseY.value = event.clientY;
  
  // Check if mouse is within the VoiceChannelView bounds
  if (isMouseInVoiceView()) {
    resetHideTimer();
  } else {
    // Mouse is outside VoiceChannelView, hide controls if not locked
    if (!controlsLocked.value) {
      showControls.value = false;
      clearTimeout(hideControlsTimer);
    }
  }
};

const handleControlsMouseEnter = () => {
  showControls.value = true;
};

const handleControlsMouseLeave = () => {
  if (!controlsLocked.value) {
    showControls.value = false;
  }
};


// LiveKit connection for video/screen sharing only
const connectToLiveKit = async () => {
  if (!appStore.currentServer || !channelId.value) return;
  
  try {
    // Connect to LiveKit room for video features only
    // Use username from auth store for LiveKit identity
    const authStore = useAuthStore();
    const username = authStore.user?.username || `user_${appStore.currentUserId}`;
    await livekitService.connectToRoom(channelId.value, username);
  } catch (error) {
    console.error('Failed to connect to LiveKit:', error);
    throw error;
  }
};

// Watch for LiveKit participant updates for video streams
watch(() => participants.value, () => {
  updateLiveKitStreams();
}, { deep: true });

const updateLiveKitStreams = () => {
  if (!livekitService.isRoomConnected()) return;
  
  // Update video and screen share streams from LiveKit participants
  const liveKitParticipants = livekitService.getRemoteParticipants();
  
  participants.value.forEach(participant => {
    const liveKitParticipant = liveKitParticipants.find(p => 
      p.identity === participant.id.toString()
    );
    
    if (liveKitParticipant) {
      // Update streams from LiveKit tracks
      liveKitParticipant.trackPublications.forEach(publication => {
        if (publication.kind === 'video' && publication.track?.mediaStreamTrack) {
          const stream = new MediaStream([publication.track.mediaStreamTrack]);
          
          // Determine if it's camera or screen share based on track name
          if (publication.trackName?.includes('screen')) {
            participant.screenShareStream = stream;
          } else {
            participant.videoStream = stream;
          }
        }
      });
    }
  });
};

onMounted(async () => {
  // Check if user is actually in the voice channel
  if (!appStore.currentVoiceChannelId || appStore.currentVoiceChannelId !== channelId.value) {
    console.warn('User not in voice channel, redirecting back');
    router.go(-1);
    return;
  }

  // Start auto-hide timer
  resetHideTimer();
  
  // Listen for mouse movement
  document.addEventListener('mousemove', handleMouseMove);
  
  // Update screen sharing and camera state from LiveKit if connected
  if (livekitService.isRoomConnected()) {
    isScreenSharing.value = livekitService.isScreenSharing();
    
    const localParticipant = livekitService.getLocalParticipant();
    if (localParticipant) {
      isCameraOn.value = localParticipant.isCameraEnabled;
    }
    
    // Update streams
    updateLiveKitStreams();
  }
  
  // Auto-focus on user if specified
  autoFocusUser();
});

onUnmounted(() => {
  clearTimeout(hideControlsTimer);
  document.removeEventListener('mousemove', handleMouseMove);
});
</script>

<style scoped>
.grid-cell {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.grid-cell video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Ensure grid fills the entire container */
.grid {
  width: 100%;
  height: 100%;
}
</style>