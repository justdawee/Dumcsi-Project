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
              <!-- Screen share video when track is available -->
              <video
                v-if="screenShareTracks.get(mainScreenShare.user.id)"
                :ref="setMainVideoRef as any"
                autoplay
                playsinline
                muted
                class="w-full h-full object-contain"
              />

              <!-- Loading state when screen sharing is starting but track not ready -->
              <div v-else class="w-full h-full flex flex-col items-center justify-center">
                <UserAvatar 
                  :user-id="mainScreenShare.user.id" 
                  :username="mainScreenShare.user.username" 
                  :avatar-url="mainScreenShare.user.avatar" 
                  :size="128" 
                />
                <div class="mt-6 flex flex-col items-center">
                  <svg class="animate-spin h-8 w-8 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span class="text-white text-lg">Starting screen share...</span>
                  <span class="text-white/70 text-sm mt-1">Connecting to {{ mainScreenShare.user.username }}'s screen</span>
                </div>
              </div>
              
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
              <!-- Media tile -->
              <div class="w-full h-full group">
                <template v-if="participant.hasScreenShare">
                  <video
                    :ref="(el: any) => setParticipantVideoRef(el, participant.id)"
                    autoplay
                    playsinline
                    muted
                    class="w-full h-full object-cover"
                  />
                </template>
                <template v-else-if="participant.videoStream">
                  <video 
                    :srcObject="participant.videoStream"
                    autoplay
                    playsinline
                    muted
                    class="w-full h-full object-cover"
                    @loadedmetadata="(e: Event) => (e.target as HTMLVideoElement)?.play()"
                  />
                </template>
                <template v-else>
                  <div class="w-full h-full flex items-center justify-center relative">
                    <UserAvatar :user-id="participant.id" :username="participant.username" :avatar-url="participant.avatar" :size="64" />
                    <!-- Screen share loading indicator -->
                    <div v-if="participant.isScreenShareLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                      <svg class="animate-spin h-6 w-6 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      <span class="text-white text-xs">Starting screen share...</span>
                    </div>
                  </div>
                </template>
              </div>
              
              <!-- User Info Overlay (hidden until hover when media present) -->
              <div 
                class="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 transition-opacity"
                :class="{
                  'opacity-0 group-hover:opacity-100': participant.hasScreenShare || participant.videoStream || participant.isScreenShareLoading,
                  'opacity-100': !(participant.hasScreenShare || participant.videoStream || participant.isScreenShareLoading)
                }"
              >
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
              <div v-if="participant.isScreenSharing" class="absolute top-2 right-2 bg-blue-600 rounded px-2 py-1">
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
import {signalRService} from '@/services/signalrService';
import { Track, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from 'livekit-client';
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
  hasScreenShare?: boolean;
  isScreenShareLoading?: boolean;
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
const isScreenSharing = computed(() => {
  const uid = appStore.currentUserId;
  const cid = channelId.value;
  if (!uid || !cid) return false;
  const set = appStore.screenShares.get(cid) || new Set();
  return set.has(uid);
});
const isScreenShareLoading = ref(false);


// Track media streams and loading state per participant (LiveKit)
// Use LiveKit's RemoteTrack for screen share and attach to <video> for reliability
const screenShareTracks = ref<Map<number, RemoteTrack>>(new Map());
const cameraStreams = ref<Map<number, MediaStream>>(new Map());
const screenShareLoading = ref<Set<number>>(new Set());

// Video element refs per participant for screen share attachment
const screenVideoRefs = ref<Map<number, HTMLVideoElement>>(new Map());
const setParticipantVideoRef = (el: HTMLVideoElement | null, userId: number) => {
  const map = screenVideoRefs.value;
  if (el) {
    map.set(userId, el);
    // Attach if track already available
    const track = screenShareTracks.value.get(userId);
    if (track) {
      try { (track as any).attach?.(el); } catch (e) { console.warn('Attach failed', e); }
    }
  } else {
    const existing = map.get(userId);
    if (existing) {
      const track = screenShareTracks.value.get(userId);
      try { (track as any)?.detach?.(existing); } catch {}
      map.delete(userId);
    }
  }
};

// Main screen share video ref
const mainVideoRef = ref<HTMLVideoElement | null>(null);
const setMainVideoRef = (el: HTMLVideoElement | null) => {
  mainVideoRef.value = el;
  // Attempt to attach current main track when set
  const current = mainScreenShare.value;
  if (el && current && current.id) {
    const track = screenShareTracks.value.get(current.id);
    if (track) {
      try { (track as any).attach?.(el); } catch (e) { console.warn('Attach main failed', e); }
    }
  }
};

// Map LiveKit identity -> app userId
const resolveUserIdForIdentity = (identity: string): number | null => {
  // If identity is numeric, use it directly
  const asNum = Number(identity);
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) return asNum;

  // Try to match by username from current channel user list
  const users = appStore.voiceChannelUsers.get(channelId.value) || [];
  const byUsername = users.find(u => u.username === identity);
  if (byUsername) return typeof byUsername.id === 'string' ? parseInt(byUsername.id as any, 10) : byUsername.id;

  // Try to match by currently computed participants
  const p = participants.value.find(p => p.username === identity);
  if (p) return p.id;

  return null;
};

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
    videoStream: cameraStreams.value.get(user.id),
    // Use track presence for ready state; store-based flag for intent state
    hasScreenShare: screenShareTracks.value.has(user.id),
    isScreenShareLoading: screenShareUsers.has(user.id) && !screenShareTracks.value.get(user.id),
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar
    },
    isCurrentUser: user.id === currentUserId
  }));
});

const participantCount = computed(() => participants.value.length); // All participants including current user

// Main Screen Share - only show when there's actual screen sharing happening
const mainScreenShare = computed(() => {
  // If a selected participant is sharing their screen with a track, prioritize them
  if (selectedParticipant.value && screenShareTracks.value.get(selectedParticipant.value.id)) {
    return {
      ...selectedParticipant.value,
      stream: null,
      user: selectedParticipant.value
    };
  }

  // Show the first available screen share that actually has a track
  const screenShareParticipant = participants.value.find(p => screenShareTracks.value.get(p.id));
  if (screenShareParticipant) {
    return {
      ...screenShareParticipant,
      stream: null,
      user: screenShareParticipant
    };
  }

  // Show loading state if anyone is actively sharing (store flag) but track not ready
  const loadingScreenSharer = participants.value.find(p => p.isScreenSharing && !screenShareTracks.value.get(p.id));
  if (loadingScreenSharer) {
    return {
      ...loadingScreenSharer,
      stream: null,
      user: loadingScreenSharer
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
  // Ensure LiveKit connection (try fallback connection if needed)
  const isConnected = await ensureLiveKitConnection();
  if (!isConnected) {
    addToast({ message: 'Failed to connect to voice channel for camera', type: 'danger' });
    return;
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
  
  // Ensure LiveKit connection (try fallback connection if needed)
  const isConnected = await ensureLiveKitConnection();
  if (!isConnected) {
    addToast({ message: 'Failed to connect to voice channel for screen sharing', type: 'danger' });
    return;
  }
  
  isScreenShareLoading.value = true;
  
  try {
    if (isScreenSharing.value) {
      console.log('🛑 Stopping screen share...');
      
      // 1. Stop screen share in LiveKit
      await livekitService.stopScreenShare();
      console.log('✅ LiveKit screen share stopped');
      
      // 2. Clear local screen share track immediately
      const currentUserId = appStore.currentUserId;
      if (currentUserId) {
        const nextTrackMap = new Map(screenShareTracks.value);
        nextTrackMap.delete(currentUserId);
        screenShareTracks.value = nextTrackMap;
        console.log('🧹 Cleared local screen share track');
      }
      
      // 3. Notify via SignalR that we stopped screen sharing
      await signalRService.stopScreenShare(route.params.serverId as string, channelId.value.toString());
      console.log('✅ SignalR stop notification sent');
      
      // 4. Force update streams to ensure clean state
      setTimeout(() => {
        updateLiveKitStreams();
        console.log('🔄 Forced stream update after stopping screen share');
      }, 200);
      
      addToast({ message: 'Screen sharing stopped', type: 'success' });
    } else {
      console.log('🎬 Starting screen share...');
      
      // 1. Start screen share in LiveKit
      const qualitySettings = {
        width: 1920,
        height: 1080,
        frameRate: 30,
        includeAudio: false
      };
      
      await livekitService.startScreenShare(qualitySettings);
      console.log('✅ LiveKit screen share started');
      
      // 3. Force update LiveKit streams to ensure own stream is captured
      setTimeout(() => {
        updateLiveKitStreams();
        console.log('🔄 Forced LiveKit streams update after screen share start');
      }, 500);
      
      // 2. Notify via SignalR that we started screen sharing
      await signalRService.startScreenShare(route.params.serverId as string, channelId.value.toString());
      console.log('✅ SignalR start notification sent');
      
      addToast({ message: 'Screen sharing started', type: 'success' });
    }
  } catch (error: any) {
    console.error('Screen share error:', error);
    addToast({ message: error.message || 'Failed to toggle screen sharing', type: 'danger' });
    // isScreenSharing is derived from store; no manual override
  } finally {
    isScreenShareLoading.value = false;
    console.log('🏁 Screen share loading state cleared');
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


// LiveKit connection management
const ensureLiveKitConnection = async (): Promise<boolean> => {
  // Check if already connected
  if (livekitService.isRoomConnected()) {
    console.log('✅ LiveKit already connected - room state:', livekitService.getRoom()?.state);
    console.log('📊 Current participants:', livekitService.getRemoteParticipants().length);
    return true;
  }

  // Try to connect if not connected
  if (!appStore.currentServer || !channelId.value) {
    console.error('❌ Cannot connect to LiveKit: missing server or channel info');
    return false;
  }

  try {
    console.log('🔄 Attempting LiveKit connection...', {
      channelId: channelId.value,
      serverId: appStore.currentServer.id,
      currentUserId: appStore.currentUserId
    });

    // Use numeric user id as LiveKit identity so mapping works across clients
    const identity = String(appStore.currentUserId ?? `user_${Date.now()}`);
    await livekitService.connectToRoom(channelId.value, identity);
    console.log('✅ LiveKit connected successfully');
    console.log('📊 Post-connection participants:', livekitService.getRemoteParticipants().length);
    
    // Force a stream update after connecting
    setTimeout(() => {
      updateLiveKitStreams();
      console.log('🔄 Forced stream update after LiveKit connection');
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to LiveKit:', error);
    return false;
  }
};

// Keep participants' media in sync with LiveKit events
const updateLiveKitStreams = () => {
  if (!livekitService.isRoomConnected()) {
    console.log('⚠️ updateLiveKitStreams: Not connected to LiveKit room');
    return;
  }

  const liveKitParticipants = livekitService.getRemoteParticipants();
  console.log('🔄 updateLiveKitStreams: Processing', liveKitParticipants.length, 'remote participants');

  // Build new maps to trigger reactivity
  const newScreenMap = new Map<number, RemoteTrack>();
  const newCamMap = new Map<number, MediaStream>(cameraStreams.value);

  liveKitParticipants.forEach(p => {
    p.trackPublications.forEach(pub => {
      const uid = resolveUserIdForIdentity(p.identity);
      if (!uid) {
        console.warn('⚠️ Could not resolve userId for identity', p.identity);
        return;
      }
      if (pub.source === Track.Source.ScreenShare && pub.track?.kind === 'video') {
        newScreenMap.set(uid, pub.track as RemoteTrack);
        console.log('🖥️ Added screen share track for user', uid);
        const nextLoading = new Set(screenShareLoading.value);
        nextLoading.delete(uid);
        screenShareLoading.value = nextLoading;
        console.log('✅ Cleared loading state for user', uid);
        // Attach to any existing video element
        const el = screenVideoRefs.value.get(uid);
        if (el) { try { (pub.track as any).attach?.(el); } catch {} }
      } else if (pub.kind === 'video' && pub.track?.mediaStreamTrack && pub.source !== Track.Source.ScreenShare) {
        const stream = new MediaStream([pub.track.mediaStreamTrack]);
        newCamMap.set(uid, stream);
        console.log('📹 Added camera stream for user', uid);
      }
    });
  });

  // Include local participant (so the sharer sees their own tile update)
  const local = livekitService.getLocalParticipant();
  if (local) {
    local.trackPublications.forEach(pub => {
      const uid = appStore.currentUserId as number | null;
      if (!uid) return;
      if (pub.source === Track.Source.ScreenShare && pub.track?.kind === 'video') {
        newScreenMap.set(uid, pub.track as any);
        console.log('🖥️ Added LOCAL screen share track for user', uid);
        const nextLoading = new Set(screenShareLoading.value);
        nextLoading.delete(uid);
        screenShareLoading.value = nextLoading;
        console.log('✅ Cleared LOCAL loading state for user', uid);
        const el = screenVideoRefs.value.get(uid);
        if (el) { try { (pub.track as any).attach?.(el); } catch {} }
      } else if (pub.kind === 'video' && pub.track?.mediaStreamTrack && pub.source !== Track.Source.ScreenShare) {
        const stream = new MediaStream([pub.track.mediaStreamTrack]);
        newCamMap.set(uid, stream);
        console.log('📹 Added LOCAL camera stream for user', uid);
      }
    });
  }

  const prevScreenShareCount = screenShareTracks.value.size;
  const newScreenShareCount = newScreenMap.size;
  
  screenShareTracks.value = newScreenMap;
  cameraStreams.value = newCamMap;
  
  console.log(`📊 Stream update complete: ${prevScreenShareCount} -> ${newScreenShareCount} screen shares,`, 
    `${newCamMap.size} cameras, loading states:`, Array.from(screenShareLoading.value));
};

// React to SignalR signals that someone started/stopped screen sharing
watch(
  () => Array.from(appStore.screenShares.get(channelId.value || -1) || new Set<number>()).join(','),
  (_str) => {
    const current = appStore.screenShares.get(channelId.value || -1) || new Set<number>();

    console.log('📺 Screen sharing state changed:', {
      channelId: channelId.value,
      currentSharers: Array.from(current),
      livekitConnected: livekitService.isRoomConnected(),
      currentScreenStreams: Array.from(screenShareTracks.value.keys()),
      loadingStates: Array.from(screenShareLoading.value)
    });

    // Ensure we are connected to LiveKit to receive screen shares
    if (current.size > 0 && !livekitService.isRoomConnected()) {
      ensureLiveKitConnection().then(() => {
        // After connecting, update streams soon after join
        setTimeout(() => updateLiveKitStreams(), 500);
      }).catch(() => {
        console.warn('LiveKit connection failed; cannot receive screen shares.');
      });
    } else {
      // Force update streams when screen sharing state changes
      updateLiveKitStreams();
    }

    // Auto-select the first screen sharer for main view (this ensures everyone sees the screen share)
    if (current.size > 0) {
      const firstSharerId = Array.from(current)[0];
      const sharerParticipant = participants.value.find(p => p.id === firstSharerId);
      if (sharerParticipant && (!selectedParticipant.value || !selectedParticipant.value.isScreenSharing)) {
        console.log('🎯 Auto-selecting screen sharer for main view:', sharerParticipant.username);
        selectedParticipant.value = sharerParticipant;
      }
    }

    // If no one is sharing anymore, reset selection and clear all states
    if (current.size === 0) {
      console.log('📺 No more screen sharers, cleaning up states');
      
      // Reset selected participant if they were only selected for screen sharing
      if (selectedParticipant.value && !selectedParticipant.value.videoStream) {
        console.log('🎯 Resetting selected participant:', selectedParticipant.value.username);
        selectedParticipant.value = null;
      }
      
      // Clear any lingering loading states
      screenShareLoading.value = new Set();
      console.log('🧹 Cleared all screen share loading states');
      
      // Clear all screen share tracks and detach any attached elements
      screenVideoRefs.value.forEach((el, uid) => {
        const t = screenShareTracks.value.get(uid);
        try { (t as any)?.detach?.(el); } catch {}
      });
      screenShareTracks.value = new Map();
      console.log('🧹 Cleared all screen share streams');
    }
    
    // If current selected participant is no longer screen sharing, deselect them
    if (selectedParticipant.value && 
        !current.has(selectedParticipant.value.id) && 
        !selectedParticipant.value.videoStream) {
      console.log('🎯 Deselecting participant who stopped screen sharing:', selectedParticipant.value.username);
      selectedParticipant.value = null;
    }
  },
  { immediate: true }
);

// Refresh mapped streams when participants change
watch(() => participants.value.map(p => p.id).join(','), () => updateLiveKitStreams());

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
    // screen share state is derived from store
    
    const localParticipant = livekitService.getLocalParticipant();
    if (localParticipant) {
      isCameraOn.value = localParticipant.isCameraEnabled;
    }
    
    // Update streams
    updateLiveKitStreams();
  }
  
  // LiveKit events: update media maps in real time
  const onTrackSub = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    console.log('🎯 Track subscribed:', {
      kind: track.kind,
      source: publication.source,
      participant: participant.identity,
      uid,
      isScreenShare: publication.source === Track.Source.ScreenShare,
      hasMediaStreamTrack: !!publication.track?.mediaStreamTrack
    });
    if (!uid) {
      console.warn('⚠️ Ignoring subscribed track; identity could not be resolved:', participant.identity);
      return;
    }
    console.log('🎯 Track subscribed:', {
      kind: track.kind,
      source: publication.source,
      participant: participant.identity,
      uid,
      isScreenShare: publication.source === Track.Source.ScreenShare,
      hasMediaStreamTrack: !!publication.track?.mediaStreamTrack
    });
    
    if (publication.source === Track.Source.ScreenShare && track.kind === 'video') {
      console.log('🖥️ Screen share track received from participant', uid);
      const next = new Map(screenShareTracks.value);
      next.set(uid, track);
      screenShareTracks.value = next;
      const nextLoading = new Set(screenShareLoading.value);
      nextLoading.delete(uid);
      screenShareLoading.value = nextLoading;
      // Attach if element exists
      const el = screenVideoRefs.value.get(uid);
      if (el) { try { (track as any).attach?.(el); } catch {} }
    } else if (publication.kind === 'video' && publication.track?.mediaStreamTrack && publication.source !== Track.Source.ScreenShare) {
      console.log('📹 Camera track received from participant', uid);
      const next = new Map(cameraStreams.value);
      next.set(uid, new MediaStream([publication.track.mediaStreamTrack]));
      cameraStreams.value = next;
    }
  };

  const onTrackUnsub = (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;
    if (publication.source === Track.Source.ScreenShare && publication.kind === 'video') {
      const el = screenVideoRefs.value.get(uid);
      if (el) { try { (_track as any).detach?.(el); } catch {} }
      const next = new Map(screenShareTracks.value);
      next.delete(uid);
      screenShareTracks.value = next;
    } else if (publication.kind === 'video' && publication.source !== Track.Source.ScreenShare) {
      const next = new Map(cameraStreams.value);
      next.delete(uid);
      cameraStreams.value = next;
    }
  };

  const onParticipantDisc = (participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;
    const el = screenVideoRefs.value.get(uid);
    if (el) { const t = screenShareTracks.value.get(uid); try { (t as any)?.detach?.(el); } catch {} }
    const nextS = new Map(screenShareTracks.value); nextS.delete(uid); screenShareTracks.value = nextS;
    const nextC = new Map(cameraStreams.value); nextC.delete(uid); cameraStreams.value = nextC;
    const nextL = new Set(screenShareLoading.value); nextL.delete(uid); screenShareLoading.value = nextL;
  };

  livekitService.onTrackSubscribed(onTrackSub);
  livekitService.onTrackUnsubscribed(onTrackUnsub);
  livekitService.onParticipantDisconnected(onParticipantDisc);

  // React when local user stops screen share via browser UI
  livekitService.onLocalScreenShareStopped(async () => {
    console.log('📺 Detected local screen share stopped via browser UI');
    // derived via store
    // Remove local screen share track and loading
    const uid = appStore.currentUserId as number | null;
    if (uid) {
      const nextTracks = new Map(screenShareTracks.value);
      nextTracks.delete(uid);
      screenShareTracks.value = nextTracks;
      const nextL = new Set(screenShareLoading.value);
      nextL.delete(uid);
      screenShareLoading.value = nextL;
    }
    // Notify others via SignalR so participants clear loading
    try {
      await signalRService.stopScreenShare(route.params.serverId as string, channelId.value.toString());
    } catch (e) {
      console.warn('Failed to notify SignalR about local screen share stop', e);
    }
    // Refresh streams and selection state
    setTimeout(() => updateLiveKitStreams(), 100);
    if (selectedParticipant.value && !(selectedParticipant.value.videoStream)) {
      selectedParticipant.value = null;
    }
  });

  // Keep main video element attached to current screen-share track
  watch([mainScreenShare, screenShareTracks], () => {
    const m = mainScreenShare.value;
    const el = mainVideoRef.value;
    if (!el) return;
    try {
      // Detach any previously attached track
      screenShareTracks.value.forEach((t) => {
        try { (t as any).detach?.(el); } catch {}
      });
      if (m) {
        const t = screenShareTracks.value.get(m.id);
        if (t) {
          (t as any).attach?.(el);
        }
      }
    } catch {}
  });
  
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
