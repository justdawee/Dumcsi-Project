<template>
  <div ref="voiceChannelViewRef" class="voice-channel-view flex h-full bg-bg-base">

    <!-- Main Voice View -->
    <div class="flex-1 flex flex-col relative">
      <!-- Voice Channel Header -->
      <div class="p-4 border-b h-14 border-border-default bg-bg-base">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <Volume2 class="w-5 h-5 text-text-muted"/>
              <h1 class="text-lg font-semibold text-text-default">{{ voiceChannelName }}</h1>
              <div class="flex items-center gap-1 ml-2">
                <Users class="w-4 h-4 text-text-muted"/>
                <span class="text-sm text-text-muted">{{ participantCount }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Voice Settings Button -->
            <button
                class="w-8 h-8 rounded hover:bg-main-800 flex items-center justify-center transition-colors"
                title="Voice settings"
                @click="showVoiceSettings = true"
            >
              <Settings class="w-4 h-4 text-text-muted"/>
            </button>
          </div>
        </div>
      </div>

      <!-- Video/Screenshare Grid -->
      <div class="flex-1 p-4 overflow-hidden">
        <div v-if="participants.length === 0" class="h-full flex items-center justify-center">
          <div class="text-center">
            <Volume2 class="w-16 h-16 mx-auto mb-4 text-text-tertiary"/>
            <h3 class="text-lg font-medium text-text-default mb-2">No one else is here</h3>
            <p class="text-text-muted">Invite someone to start a conversation</p>
          </div>
        </div>

        <div v-else class="h-full">

          <!-- Main Screen Share View -->
          <div v-if="mainScreenShare" class="h-full flex flex-col">
            <div 
              :class="[
                'flex-1 bg-black rounded-lg overflow-hidden mb-4 relative transition-all',
                mainScreenShare.isSpeaking 
                  ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/20'
                  : ''
              ]"
            >
              <!-- Screen share video when track is available -->
              <video
                  v-if="screenShareTracks.get(mainScreenShare.user.id)"
                  :ref="mainVideoVNodeRef"
                  autoplay
                  class="w-full h-full object-contain"
                  muted
                  playsinline
              />

              <!-- Loading state when screen sharing is starting but track not ready -->
              <div v-else class="w-full h-full flex flex-col items-center justify-center">
                <UserAvatar
                    :avatar-url="mainScreenShare.user.avatar"
                    :size="128"
                    :user-id="mainScreenShare.user.id"
                    :username="mainScreenShare.user.username"
                />
                <div class="mt-6 flex flex-col items-center">
                  <svg class="animate-spin h-8 w-8 text-white mb-3" fill="none" viewBox="0 0 24 24"
                       xmlns="http://www.w3.org/2000/svg">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor"></path>
                  </svg>
                  <span class="text-white text-lg">Starting screen share...</span>
                  <span class="text-white/70 text-sm mt-1">Connecting to {{
                      mainScreenShare.user.username
                    }}'s screen</span>
                </div>
              </div>

              <div class="absolute bottom-4 left-4 bg-black/70 rounded px-3 py-1">
                <span class="text-white text-sm font-medium">{{ mainScreenShare.user.username }}</span>
                <span class="text-white/70 text-xs ml-1">is sharing their screen</span>
              </div>

              <!-- Volume Control for Screen Share (viewers only) -->
              <div
                v-if="mainScreenShare.user.id !== appStore.currentUserId"
                class="absolute bottom-4 right-4"
              >
                <VolumeControl
                  :volume="getUserVolume(mainScreenShare.user.id)"
                  :user-id="mainScreenShare.user.id"
                  :username="mainScreenShare.user.username"
                  @volume-change="handleVolumeChange"
                />
              </div>
            </div>

            <!-- Other Participants Strip -->
            <div class="flex gap-2 max-h-24">
              <div
                  v-for="participant in otherParticipants"
                  :key="participant.id"
                  :class="[
                    'w-32 h-20 bg-main-800 rounded cursor-pointer transition-all relative overflow-hidden',
                    participant.isSpeaking 
                      ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/20'
                      : 'hover:ring-2 hover:ring-primary'
                  ]"
                  @click="selectMainView(participant)"
              >
                <video
                    v-if="participant.videoStream"
                    :srcObject="participant.videoStream"
                    autoplay
                    class="w-full h-full object-cover"
                    muted
                    playsinline
                    @loadedmetadata="onVideoLoadedMetadata"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <UserAvatar :avatar-url="participant.avatar" :size="32"
                              :user-id="participant.id" :username="participant.username"/>
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
                  :class="[
                    participantClasses,
                    participant.isSpeaking 
                      ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/20'
                      : 'hover:ring-2 hover:ring-primary'
                  ]"
                  class="bg-main-800 rounded-lg overflow-hidden relative cursor-pointer transition-all"
                  @click="selectMainView(participant)"
              >
                <!-- Media tile -->
                <div class="w-full h-full group">
                  <template v-if="participant.hasScreenShare">
                    <video
                    :ref="createVideoRefForUser(participant.id)"
                    autoplay
                    class="w-full h-full object-cover"
                    muted
                    playsinline
                  />
                  </template>
                  <template v-else-if="participant.videoStream">
                    <video
                        :srcObject="participant.videoStream"
                        autoplay
                        class="w-full h-full object-cover"
                        muted
                        playsinline
                        @loadedmetadata="onVideoLoadedMetadata"
                    />
                  </template>
                  <template v-else>
                    <div class="w-full h-full flex items-center justify-center relative">
                      <UserAvatar :avatar-url="participant.avatar" :size="64"
                                  :user-id="participant.id" :username="participant.username"/>
                      <!-- Screen share loading indicator -->
                      <div v-if="participant.isScreenShareLoading"
                           class="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                        <svg class="animate-spin h-6 w-6 text-white mb-2" fill="none" viewBox="0 0 24 24"
                             xmlns="http://www.w3.org/2000/svg">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                  stroke-width="4"></circle>
                          <path class="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor"></path>
                        </svg>
                        <span class="text-white text-xs">Starting screen share...</span>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- User Info Overlay (hidden until hover when media present) -->
                <div
                    :class="{
                  'opacity-0 group-hover:opacity-100': participant.hasScreenShare || participant.videoStream || participant.isScreenShareLoading,
                  'opacity-100': !(participant.hasScreenShare || participant.videoStream || participant.isScreenShareLoading)
                }"
                    class="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 transition-opacity"
                >
                  <div class="flex items-center gap-2">
                  <span class="text-white text-sm font-medium">
                    {{ participant.username }}
                    <span v-if="participant.isCurrentUser" class="text-green-400 font-bold">(You)</span>
                  </span>
                    <div
                      v-if="participant.isScreenSharing || participant.isDeafened || participant.isMuted"
                      class="flex items-center gap-1"
                    >
                      <!-- Screen sharing icon (leftmost) -->
                      <Monitor v-if="participant.isScreenSharing" class="w-3 h-3 text-blue-400" title="Screen Sharing"/>
                      <!-- Prioritize deafen over mute -->
                      <VolumeX v-if="participant.isDeafened" class="w-3 h-3 text-red-400" title="Deafened"/>
                      <MicOff v-else-if="participant.isMuted" class="w-3 h-3 text-red-400" title="Muted"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Auto-hiding Voice Controls -->
        <div
            :class="{
          'translate-y-full': !showControls && !controlsLocked,
          'translate-y-0': showControls || controlsLocked
        }"
            class="voice-controls absolute bottom-0 left-0 right-0 transition-transform duration-300"
            @mouseenter="handleControlsMouseEnter"
            @mouseleave="handleControlsMouseLeave"
        >
          <div class="p-6">
            <div class="flex items-center justify-center gap-6">
              <!-- Primary Controls Group (Mic + Deafen) -->
              <div class="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <!-- Mute Button -->
                <button
                    :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  appStore.selfMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-main-700 hover:bg-main-600'
                ]"
                    :title="appStore.selfMuted ? 'Unmute' : 'Mute'"
                    @click="toggleMute"
                >
                  <Mic v-if="!appStore.selfMuted" class="w-5 h-5 text-white"/>
                  <MicOff v-else class="w-5 h-5 text-white"/>
                </button>

                <!-- Deafen Button -->
                <button
                    :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  appStore.selfDeafened ? 'bg-red-600 hover:bg-red-700' : 'bg-main-700 hover:bg-main-600'
                ]"
                    :title="appStore.selfDeafened ? 'Undeafen' : 'Deafen'"
                    @click="toggleDeafen"
                >
                  <Volume2 v-if="!appStore.selfDeafened" class="w-5 h-5 text-white"/>
                  <VolumeX v-else class="w-5 h-5 text-white"/>
                </button>
              </div>

              <!-- Camera + Screen Share Group -->
              <div class="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <!-- Camera Button -->
                <button
                    :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  isCameraOn ? 'bg-green-600 hover:bg-green-700' : 'bg-main-700 hover:bg-main-600'
                ]"
                    :title="isCameraOn ? 'Turn off camera' : 'Turn on camera'"
                    @click="toggleCamera"
                    @contextmenu="handleCameraRightClick"
                >
                  <Video v-if="isCameraOn" class="w-5 h-5 text-white"/>
                  <VideoOff v-else class="w-5 h-5 text-white"/>
                </button>

                <!-- Screen Share Button -->
                <button
                    :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-main-700 hover:bg-main-600'
                ]"
                    :disabled="isScreenShareLoading"
                    :title="isScreenSharing ? 'Stop screen share' : 'Share screen'"
                    @click="toggleScreenShare"
                    @contextmenu="handleScreenShareRightClick"
                >
                  <Monitor v-if="isScreenSharing" class="w-5 h-5 text-white"/>
                  <MonitorSpeaker v-else class="w-5 h-5 text-white"/>
                </button>
              </div>

              <!-- Disconnect Button (Individual) -->
              <div class="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <button
                    class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
                    title="Disconnect"
                    @click="disconnectVoice"
                >
                  <PhoneOff class="w-5 h-5 text-white"/>
                </button>
              </div>

              <!-- Lock Controls Button -->
              <div class="bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 ml-4">
                <button
                    :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  controlsLocked ? 'bg-primary' : 'hover:bg-main-700'
                ]"
                    :title="controlsLocked ? 'Unlock controls' : 'Lock controls visible'"
                    @click="controlsLocked = !controlsLocked"
                >
                  <Lock v-if="controlsLocked" class="w-4 h-4 text-white"/>
                  <Unlock v-else class="w-4 h-4 text-text-muted"/>
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
  </div>

  <!-- Context Menus -->
  <ContextMenu ref="cameraContextMenu" :items="cameraMenuItems" />
  <ContextMenu ref="screenShareContextMenu" :items="screenShareMenuItems" />
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {livekitService} from '@/services/livekitService';
import {webrtcService} from '@/services/webrtcService';
import {signalRService} from '@/services/signalrService';
import { useScreenShareSettings } from '@/composables/useScreenShareSettings';
import { useScreenShareVolumeControl } from '@/composables/useScreenShareVolumeControl';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import type { MenuItem } from '@/components/ui/ContextMenu.vue';
import { useCameraSettings } from '@/composables/useCameraSettings';
import {Track, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication} from 'livekit-client';
import { useLocalCameraState } from '@/composables/useLocalCameraState';
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
import VolumeControl from '@/components/voice/VolumeControl.vue';

interface VoiceParticipant {
  id: number;
  username: string;
  avatar?: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking?: boolean;
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
const {addToast} = useToast();
const { resolutionOptions, fpsOptions, selectedQuality, selectedFPS, includeAudio, getCurrentSettings } = useScreenShareSettings();
const { getUserVolume, setUserVolume, applyVolumeToElement } = useScreenShareVolumeControl();

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

// Voice controls state (shared)
const { isLocalCameraOn, isTogglingCamera, ensureCameraStateInitialized } = useLocalCameraState();
const isCameraOn = ref(false);
watch(
  () => isLocalCameraOn.value,
  (v) => { isCameraOn.value = v; },
  { immediate: true }
);

// Context menu state
const cameraContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const screenShareContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const isScreenSharing = computed(() => {
  const uid = appStore.currentUserId;
  const cid = channelId.value;
  if (!uid || !cid) return false;
  const set = appStore.screenShares.get(cid) || new Set();
  // Prefer store (cross‑client state), but fall back to LiveKit local state
  return set.has(uid) || livekitService.isScreenSharing();
});
const isScreenShareLoading = ref(false);


// Track media streams and loading state per participant (LiveKit)
// Use LiveKit's RemoteTrack for screen share and attach to <video> for reliability
const screenShareTracks = ref<Map<number, RemoteTrack>>(new Map());
const cameraStreams = ref<Map<number, MediaStream>>(new Map());
const screenShareLoading = ref<Set<number>>(new Set());
// Audio elements for screen share audio per participant
const screenShareAudioEls = ref<Map<number, HTMLMediaElement>>(new Map());

// Speaking state tracking
const speakingUsers = ref<Set<number>>(new Set());
const speakingTimeouts = ref<Map<number, number>>(new Map());

// Voice activity detection
const SPEAKING_TIMEOUT = 250; // 0.25s after audio stops, remove speaking indicator (snappier)
const AUDIO_THRESHOLD = -50; // dB threshold for considering as speaking
const activeAudioAnalyzers = ref<Map<number, AnalyserNode>>(new Map());

const setSpeaking = (userId: number, speaking: boolean) => {
  const timeouts = speakingTimeouts.value;
  const users = speakingUsers.value;
  
  if (speaking) {
    // Clear any existing timeout for this user
    const existingTimeout = timeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeouts.delete(userId);
    }
    
    // Add user to speaking set
    if (!users.has(userId)) {
      const newUsers = new Set(users);
      newUsers.add(userId);
      speakingUsers.value = newUsers;
    }
  } else {
    // Set timeout to remove speaking indicator after delay
    const existingTimeout = timeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      const newUsers = new Set(speakingUsers.value);
      newUsers.delete(userId);
      speakingUsers.value = newUsers;
      timeouts.delete(userId);
    }, SPEAKING_TIMEOUT);
    
    timeouts.set(userId, timeout);
  }
};

const monitorAudioLevel = (audioTrack: MediaStreamTrack, userId: number) => {
  // Check if we're already monitoring this user
  if (activeAudioAnalyzers.value.has(userId)) {
    return;
  }

  try {
    // Check if AudioContext is available and user has interacted with the page
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      console.warn('AudioContext not available for audio monitoring');
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Check if audio context creation failed or is suspended
    if (audioContext.state === 'suspended') {
      // Try to resume context, but handle if it fails due to lack of user interaction
      audioContext.resume().catch((error) => {
        console.warn('Could not resume audio context for user', userId, '- user interaction may be required:', error);
        audioContext.close();
        return;
      });
    }

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    
    activeAudioAnalyzers.value.set(userId, analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isCurrentlySpeaking = false;
    let lastNotifyState: boolean | null = null;
    
    const checkAudioLevel = () => {
      // Check if track is still active
      if (audioTrack.readyState !== 'live') {
        activeAudioAnalyzers.value.delete(userId);
        setSpeaking(userId, false);
        audioContext.close().catch(() => {});
        return;
      }
      
      // Check if context is still valid
      if (audioContext.state === 'closed') {
        activeAudioAnalyzers.value.delete(userId);
        setSpeaking(userId, false);
        return;
      }
      
      try {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Convert to approximate dB (this is a simplified calculation)
        const dB = average > 0 ? 20 * Math.log10(average / 255) : -100;
        
        const speaking = dB > AUDIO_THRESHOLD;
        
        if (speaking !== isCurrentlySpeaking) {
          isCurrentlySpeaking = speaking;
          setSpeaking(userId, speaking);

          // Emit SignalR speaking updates for local user only
          if (appStore.currentUserId && userId === appStore.currentUserId) {
            if (lastNotifyState !== speaking) {
              lastNotifyState = speaking;
              try {
                const cid = channelId.value;
                if (cid) {
                  if (speaking) signalRService.startSpeaking(cid);
                  else signalRService.stopSpeaking(cid);
                }
              } catch {}
            }
          }
        }
        
        // Continue monitoring
        requestAnimationFrame(checkAudioLevel);
      } catch (analyzerError) {
        console.warn('Audio analysis failed for user', userId, ':', analyzerError);
        activeAudioAnalyzers.value.delete(userId);
        setSpeaking(userId, false);
        audioContext.close().catch(() => {});
      }
    };
    
    checkAudioLevel();
  } catch (error) {
    console.warn('Failed to create audio analyzer for user:', userId, error);
    // Don't throw the error, just log it and continue without audio monitoring
  }
};

// Video element refs per participant for screen share attachment
const screenVideoRefs = ref<Map<number, HTMLVideoElement>>(new Map());
const setParticipantVideoRef = (el: HTMLVideoElement | null, userId: number) => {
  const map = screenVideoRefs.value;
  if (el) {
    map.set(userId, el);
    // Attach if track already available
    const track = screenShareTracks.value.get(userId);
    if (track) {
      try {
        (track as any).attach?.(el);
      } catch { /* ignore */
      }
    }
  } else {
    const existing = map.get(userId);
    if (existing) {
      const track = screenShareTracks.value.get(userId);
      try {
        (track as any)?.detach?.(existing);
      } catch {
      }
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
      try {
        (track as any).attach?.(el);
      } catch { /* ignore */
      }
    }
  }
};

// Helpers to satisfy Vue's VNodeRef function signature (el, refs)
type VNodeRefFunction = (el: Element | ComponentPublicInstance | null, refs?: Record<string, any>) => void;
const createVideoRefForUser = (userId: number): VNodeRefFunction => {
  return (el) => {
    setParticipantVideoRef(el as HTMLVideoElement | null, userId);
  };
};
const mainVideoVNodeRef: VNodeRefFunction = (el) => {
  setMainVideoRef(el as HTMLVideoElement | null);
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
  const speakingFromStore = appStore.speakingUsers.get(channelId.value) || new Set();


  // Map users to participants
  return users.map(user => ({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    isMuted: user.id === currentUserId ? appStore.selfMuted : !!(appStore.voiceStates.get(channelId.value)?.get(user.id)?.muted),
    isDeafened: user.id === currentUserId ? appStore.selfDeafened : !!(appStore.voiceStates.get(channelId.value)?.get(user.id)?.deafened),
    // Prefer store-based speaking (SignalR) fallback to local analyzer
    isSpeaking: speakingFromStore.has(user.id) || speakingUsers.value.has(user.id),
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

  if (count <= 1) return `${base} grid-cols-1`;
  if (count <= 2) return `${base} grid-cols-2`;
  if (count <= 4) return `${base} grid-cols-2`;
  if (count <= 6) return `${base} grid-cols-3`;
  if (count <= 9) return `${base} grid-cols-3`;
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

// Volume control handler
const handleVolumeChange = (volume: number) => {
  const userId = mainScreenShare.value?.user.id;
  if (userId) {
    setUserVolume(userId, volume);
    
    // Apply volume to the audio element if it exists
    const audioElement = screenShareAudioEls.value.get(userId);
    if (audioElement) {
      applyVolumeToElement(userId, audioElement);
    }
  }
};

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
  if (isTogglingCamera.value) return;
  isTogglingCamera.value = true;
  // Ensure LiveKit connection (try fallback connection if needed)
  const isConnected = await ensureLiveKitConnection();
  if (!isConnected) {
    addToast({message: 'Failed to connect to voice channel for camera', type: 'danger'});
    isTogglingCamera.value = false;
    return;
  }

  try {
    const localParticipant = livekitService.getLocalParticipant();
    if (!localParticipant) return;

    const isCameraEnabled = localParticipant.isCameraEnabled;

    // Toggle camera
    if (!isCameraEnabled) {
      // Guard: if already published and not muted, don't start again
      try {
        const existing: any = localParticipant.getTrackPublication(Track.Source.Camera);
        if (existing?.track && !existing?.isMuted) {
          isLocalCameraOn.value = true;
          return;
        }
      } catch {}
      const camOpts: any = {};
      // Try to pass deviceId to LiveKit (best-effort)
      try {
        const { selectedDeviceId, selectedQuality } = useCameraSettings();
        if (selectedDeviceId.value) camOpts.deviceId = selectedDeviceId.value as any;
        await localParticipant.setCameraEnabled(true, camOpts as any);
        // After publish, try to apply resolution constraints directly
        setTimeout(() => {
          try {
            const pub = localParticipant.getTrackPublication(Track.Source.Camera) as any;
            const track = pub?.track as any;
            const media = track?.mediaStreamTrack as MediaStreamTrack | undefined;
            if (media && media.applyConstraints) {
              media.applyConstraints({
                width: { ideal: selectedQuality.value.width },
                height: { ideal: selectedQuality.value.height }
              } as any).catch(() => {});
            }
          } catch {}
        }, 200);
      } catch {
        await localParticipant.setCameraEnabled(true);
      }
    } else {
      await localParticipant.setCameraEnabled(false);
    }

    // Sync shared state from LiveKit
    try { isLocalCameraOn.value = livekitService.getLocalParticipant()?.isCameraEnabled ?? false; } catch {}
    
    // Force update streams after camera toggle (delay to ensure track changes are processed)
    setTimeout(() => updateLiveKitStreams(), 300);
    
  } catch (error: any) {
    console.error('Camera toggle error:', error);
    addToast({
      message: error.message || 'Failed to toggle camera',
      type: 'danger'
    });
  } finally {
    isTogglingCamera.value = false;
  }
};

const toggleScreenShare = async () => {
  if (isScreenShareLoading.value) return;

  // Ensure LiveKit connection (try fallback connection if needed)
  const isConnected = await ensureLiveKitConnection();
  if (!isConnected) {
    addToast({message: 'Failed to connect to voice channel for screen sharing', type: 'danger'});
    return;
  }

  isScreenShareLoading.value = true;

  try {
    if (isScreenSharing.value) {


      // 1. Stop screen share in LiveKit
      await livekitService.stopScreenShare();


      // 2. Clear local screen share track immediately
      const currentUserId = appStore.currentUserId;
      if (currentUserId) {
        const nextTrackMap = new Map(screenShareTracks.value);
        nextTrackMap.delete(currentUserId);
        screenShareTracks.value = nextTrackMap;

      }

      // 3. Update local store immediately and notify via SignalR
      const uid = appStore.currentUserId;
      if (uid) {
        try { appStore.handleUserStoppedScreenShare(channelId.value, uid); } catch {}
      }
      await signalRService.stopScreenShare(route.params.serverId as string, channelId.value.toString());


      // 4. Force update streams to ensure clean state
      setTimeout(() => {
        updateLiveKitStreams();

      }, 200);

      
    } else {


      // 1. Start screen share in LiveKit
      const qualitySettings = getCurrentSettings();

      await livekitService.startScreenShare(qualitySettings);


      // 3. Force update LiveKit streams to ensure own stream is captured
      setTimeout(() => {
        updateLiveKitStreams();

      }, 500);

      // 2. Update local store immediately and notify via SignalR
      const uid = appStore.currentUserId;
      if (uid) {
        try { appStore.handleUserStartedScreenShare(channelId.value, uid); } catch {}
      }
      await signalRService.startScreenShare(route.params.serverId as string, channelId.value.toString());


      
    }
  } catch (error: any) {
    console.error('Screen share error:', error);
    addToast({message: error.message || 'Failed to toggle screen sharing', type: 'danger'});
    // isScreenSharing is derived from store; no manual override
  } finally {
    isScreenShareLoading.value = false;

  }
};

// Context menu state and items
const { devices: cameraDevices, selectedDeviceId, selectedQuality: selectedCamQuality, qualityOptions: cameraQualityOptions, ensureDevicesLoaded } = useCameraSettings();

const cameraMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [];
  items.push({ type: 'label', label: 'Camera' });

  // Device list
  if ((cameraDevices.value || []).length > 0) {
    items.push({ type: 'label', label: 'Device' });
    cameraDevices.value.forEach(d => {
      items.push({
        label: d.label || 'Camera',
        checked: selectedDeviceId.value === d.deviceId,
        action: () => { selectedDeviceId.value = d.deviceId; }
      });
    });
  } else {
    items.push({ type: 'label', label: 'Device' });
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

const screenShareMenuItems = computed<MenuItem[]>(() => {
  if (isScreenSharing.value) {
    return [
      { type: 'label', label: 'Screen Share' },
      {
        label: 'Stop Screen Share',
        icon: Monitor,
        action: () => toggleScreenShare()
      }
    ];
  } else {
    const items: MenuItem[] = [];

    // Primary action
    items.push({ type: 'label', label: 'Screen Share' });
    items.push({
      label: 'Start Screen Share',
      icon: MonitorSpeaker,
      action: () => toggleScreenShare()
    });
    items.push({ type: 'separator' });

    // Resolution group
    items.push({ type: 'label', label: 'Resolution' });
    resolutionOptions.forEach(option => {
      items.push({
        label: `${option.label} (${option.resolution})`,
        checked: selectedQuality.value.value === option.value,
        action: () => {
          selectedQuality.value = option;
        }
      });
    });

    items.push({ type: 'separator' });

    // FPS group
    items.push({ type: 'label', label: 'Frame Rate' });
    fpsOptions.forEach(option => {
      items.push({
        label: `${option.label} – ${option.description}`,
        checked: selectedFPS.value === option.value,
        action: () => {
          selectedFPS.value = option.value;
        }
      });
    });

    items.push({ type: 'separator' });

    // Audio toggle
    items.push({
      label: 'Include Audio',
      checked: includeAudio.value,
      action: () => {
        includeAudio.value = !includeAudio.value;
      }
    });

    return items;
  }
});

// Context menu handlers
const handleCameraRightClick = async (event: MouseEvent) => {
  event.preventDefault();
  try { await ensureDevicesLoaded(); } catch {}
  cameraContextMenu.value?.open(event);
};

const handleScreenShareRightClick = (event: MouseEvent) => {
  event.preventDefault();
  screenShareContextMenu.value?.open(event);
};

const disconnectVoice = async () => {
  if (appStore.currentVoiceChannelId) {
    const serverId = route.params.serverId;
    await appStore.leaveVoiceChannel(appStore.currentVoiceChannelId);

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

    return true;
  }

  // Try to connect if not connected
  if (!appStore.currentServer || !channelId.value) {
    console.error('❌ Cannot connect to LiveKit: missing server or channel info');
    return false;
  }

  try {


    // Use numeric user id as LiveKit identity so mapping works across clients
    const identity = String(appStore.currentUserId ?? `user_${Date.now()}`);
    await livekitService.connectToRoom(channelId.value, identity);


    // Force a stream update after connecting
    setTimeout(() => {
      updateLiveKitStreams();

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

    return;
  }

  const liveKitParticipants = livekitService.getRemoteParticipants();


  // Build new maps to trigger reactivity (start fresh to remove inactive streams)
  const newScreenMap = new Map<number, RemoteTrack>();
  const newCamMap = new Map<number, MediaStream>();

  liveKitParticipants.forEach(p => {
    p.trackPublications.forEach(pub => {
      const uid = resolveUserIdForIdentity(p.identity);
      if (!uid) {
        return;
      }
      
      // Monitor audio for voice activity detection
      if (pub.source === Track.Source.Microphone && pub.track && !pub.isMuted) {
        try {
          const audioTrack = pub.track as any;
          if (audioTrack.mediaStreamTrack) {
            monitorAudioLevel(audioTrack.mediaStreamTrack, uid);
          }
        } catch (error) {
          console.warn('Failed to monitor audio level for participant:', uid, error);
        }
      }
      if (pub.source === Track.Source.ScreenShare && pub.track?.kind === 'video' && !pub.isMuted) {
        newScreenMap.set(uid, pub.track as RemoteTrack);

        const nextLoading = new Set(screenShareLoading.value);
        nextLoading.delete(uid);
        screenShareLoading.value = nextLoading;

        // Attach to any existing video element
        const el = screenVideoRefs.value.get(uid);
        if (el) {
          try {
            (pub.track as any).attach?.(el);
          } catch {
          }
        }
      } else if (pub.kind === 'video' && pub.track?.mediaStreamTrack && pub.source === Track.Source.Camera && !pub.isMuted) {
        const stream = new MediaStream([pub.track.mediaStreamTrack]);
        newCamMap.set(uid, stream);
        console.log('🎥 Added camera stream for remote user', uid);
      }
    });
  });

  // Include local participant (so the user sees their own camera/screen share)
  const local = livekitService.getLocalParticipant();
  if (local) {
    const uid = appStore.currentUserId as number | null;
    if (uid) {
      local.trackPublications.forEach(pub => {
        // Monitor local audio for voice activity detection
        if (pub.source === Track.Source.Microphone && pub.track && !pub.isMuted) {
          try {
            const audioTrack = pub.track as any;
            if (audioTrack.mediaStreamTrack) {
              monitorAudioLevel(audioTrack.mediaStreamTrack, uid);
            }
          } catch (error) {
            console.warn('Failed to monitor local audio level:', error);
          }
        }
        
        if (pub.source === Track.Source.ScreenShare && pub.track?.kind === 'video' && !pub.isMuted) {
        newScreenMap.set(uid, pub.track as any);

        const nextLoading = new Set(screenShareLoading.value);
        nextLoading.delete(uid);
        screenShareLoading.value = nextLoading;

        const el = screenVideoRefs.value.get(uid);
        if (el) {
          try {
            (pub.track as any).attach?.(el);
          } catch {
          }
        }
      } else if (pub.kind === 'video' && pub.track?.mediaStreamTrack && pub.source === Track.Source.Camera && !pub.isMuted) {
        // Handle local camera track specifically
        const stream = new MediaStream([pub.track.mediaStreamTrack]);
        newCamMap.set(uid, stream);
        console.log('🎥 Added local camera stream for user', uid);
      }
      });
    }
  }

  // Log changes for debugging
  const oldCamCount = cameraStreams.value.size;
  const newCamCount = newCamMap.size;
  if (oldCamCount !== newCamCount) {
    console.log('🎥 Camera streams updated:', oldCamCount, '->', newCamCount);
  }

  screenShareTracks.value = newScreenMap;
  cameraStreams.value = newCamMap;


};

// React to SignalR signals that someone started/stopped screen sharing
watch(
    () => Array.from(appStore.screenShares.get(channelId.value || -1) || new Set<number>()).join(','),
    (_str) => {
      const current = appStore.screenShares.get(channelId.value || -1) || new Set<number>();


      // Ensure we are connected to LiveKit to receive screen shares
      if (current.size > 0 && !livekitService.isRoomConnected()) {
        ensureLiveKitConnection().then(() => {
          // After connecting, update streams soon after join
          setTimeout(() => updateLiveKitStreams(), 500);
        }).catch(() => {

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

          selectedParticipant.value = sharerParticipant;
        }
      }

      // If no one is sharing anymore, reset selection and clear all states
      if (current.size === 0) {


        // Reset selected participant if they were only selected for screen sharing
        if (selectedParticipant.value && !selectedParticipant.value.videoStream) {

          selectedParticipant.value = null;
        }

        // Clear any lingering loading states
        screenShareLoading.value = new Set();


        // Clear all screen share tracks and detach any attached elements
        screenVideoRefs.value.forEach((el, uid) => {
          const t = screenShareTracks.value.get(uid);
          try {
            (t as any)?.detach?.(el);
          } catch {
          }
        });
        screenShareTracks.value = new Map();

        // Also clear any screen share audio elements
        screenShareAudioEls.value.forEach((aEl) => {
          try { aEl.pause?.(); } catch {}
        });
        screenShareAudioEls.value = new Map();

      }

      // If current selected participant is no longer screen sharing, deselect them
      if (selectedParticipant.value &&
          !current.has(selectedParticipant.value.id) &&
          !selectedParticipant.value.videoStream) {

        selectedParticipant.value = null;
      }
    },
    {immediate: true}
);

// Refresh mapped streams when participants change
watch(() => participants.value.map(p => p.id).join(','), () => updateLiveKitStreams());

onMounted(async () => {
  // Initialize shared camera state listeners
  try { ensureCameraStateInitialized(); } catch {}
  // Check if user is actually in the voice channel
  if (!appStore.currentVoiceChannelId || appStore.currentVoiceChannelId !== channelId.value) {

    router.go(-1);
    return;
  }

  // Start auto-hide timer
  resetHideTimer();

  // Listen for mouse movement
  document.addEventListener('mousemove', handleMouseMove);

  // Ensure we are connected to LiveKit so late joiners receive existing streams
  if (!livekitService.isRoomConnected()) {
    try {
      await ensureLiveKitConnection();
    } catch {}
  }

  // Update screen sharing and camera state from LiveKit once connected
  if (livekitService.isRoomConnected()) {
    const localParticipant = livekitService.getLocalParticipant();
    if (localParticipant) {
      isLocalCameraOn.value = localParticipant.isCameraEnabled;
    }
    updateLiveKitStreams();
  }

  // LiveKit events: update media maps in real time
  const onTrackSub = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;

    if (publication.source === Track.Source.ScreenShare && track.kind === 'video') {
      const next = new Map(screenShareTracks.value);
      next.set(uid, track);
      screenShareTracks.value = next;
      const nextLoading = new Set(screenShareLoading.value);
      nextLoading.delete(uid);
      screenShareLoading.value = nextLoading;
      // Attach if element exists
      const el = screenVideoRefs.value.get(uid);
      if (el) {
        try {
          (track as any).attach?.(el);
        } catch {
        }
      }
    } else if (publication.kind === 'video' && publication.track?.mediaStreamTrack && publication.source === Track.Source.Camera) {
      const next = new Map(cameraStreams.value);
      next.set(uid, new MediaStream([publication.track.mediaStreamTrack]));
      cameraStreams.value = next;
      console.log('🎥 Updated camera stream for remote user', uid);
    } else if (publication.kind === 'audio' && ((publication as any).source === (Track as any).Source.ScreenShareAudio || publication.source === Track.Source.ScreenShare)) {
      // Do not play our own screen share audio locally
      if (appStore.currentUserId && uid === appStore.currentUserId) {
        return;
      }
      // Attach screen share audio so others hear system/tab audio
      try {
        // Clean up any existing element to avoid duplicate playback
        const existing = screenShareAudioEls.value.get(uid);
        if (existing) {
          try { (track as any).detach?.(existing); } catch {}
          try { existing.pause?.(); existing.remove?.(); } catch {}
        }

        const el = (track as any).attach?.();
        if (el) {
          el.autoplay = true;
          el.muted = false;
          el.playsInline = true as any;
          try { el.play?.(); } catch {}
          // Apply user's volume setting
          applyVolumeToElement(uid, el as HTMLMediaElement);
          const next = new Map(screenShareAudioEls.value);
          next.set(uid, el as HTMLMediaElement);
          screenShareAudioEls.value = next;
        }
      } catch {}
    }
  };

  const onTrackUnsub = (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;
    if (publication.source === Track.Source.ScreenShare && publication.kind === 'video') {
      const el = screenVideoRefs.value.get(uid);
      if (el) {
        try {
          (_track as any).detach?.(el);
        } catch {
        }
      }
      const next = new Map(screenShareTracks.value);
      next.delete(uid);
      screenShareTracks.value = next;
    } else if (publication.kind === 'video' && publication.source === Track.Source.Camera) {
      const next = new Map(cameraStreams.value);
      next.delete(uid);
      cameraStreams.value = next;
      console.log('🎥 Removed camera stream for user', uid);
    } else if (publication.kind === 'audio' && ((publication as any).source === (Track as any).Source.ScreenShareAudio || publication.source === Track.Source.ScreenShare)) {
      const el = screenShareAudioEls.value.get(uid);
      if (el) {
        try { (_track as any).detach?.(el); } catch {}
        try { el.pause?.(); } catch {}
      }
      const next = new Map(screenShareAudioEls.value);
      next.delete(uid);
      screenShareAudioEls.value = next;
    }
  };

  const onParticipantDisc = (participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;
    const el = screenVideoRefs.value.get(uid);
    if (el) {
      const t = screenShareTracks.value.get(uid);
      try {
        (t as any)?.detach?.(el);
      } catch {
      }
    }
    const nextS = new Map(screenShareTracks.value);
    nextS.delete(uid);
    screenShareTracks.value = nextS;
    const nextC = new Map(cameraStreams.value);
    nextC.delete(uid);
    cameraStreams.value = nextC;
    // Clean screen share audio element
    const aEl = screenShareAudioEls.value.get(uid);
    if (aEl) {
      try { aEl.pause?.(); } catch {}
    }
    const nextA = new Map(screenShareAudioEls.value);
    nextA.delete(uid);
    screenShareAudioEls.value = nextA;
    const nextL = new Set(screenShareLoading.value);
    nextL.delete(uid);
    screenShareLoading.value = nextL;
  };

  livekitService.onTrackSubscribed(onTrackSub);
  livekitService.onTrackUnsubscribed(onTrackUnsub);
  livekitService.onParticipantDisconnected(onParticipantDisc);

  // React to mute/unmute of camera tracks (including local)
  livekitService.onTrackMuted((publication: any, participant: any) => {
    try {
      if (publication?.kind === 'video' && publication?.source === Track.Source.Camera) {
        const uid = resolveUserIdForIdentity(participant?.identity);
        if (!uid) return;
        const next = new Map(cameraStreams.value);
        next.delete(uid);
        cameraStreams.value = next;
      }
      if (publication?.kind === 'audio' && (publication?.source === (Track as any).Source.ScreenShareAudio || publication?.source === Track.Source.ScreenShare)) {
        const uid = resolveUserIdForIdentity(participant?.identity);
        if (!uid) return;
        const el = screenShareAudioEls.value.get(uid);
        if (el) { try { el.pause?.(); } catch {} }
        const next = new Map(screenShareAudioEls.value);
        next.delete(uid);
        screenShareAudioEls.value = next;
      }
    } catch {}
  });
  livekitService.onTrackUnmuted((publication: any, participant: any) => {
    try {
      if (publication?.kind === 'video' && publication?.source === Track.Source.Camera && publication?.track?.mediaStreamTrack) {
        const uid = resolveUserIdForIdentity(participant?.identity);
        if (!uid) return;
        const next = new Map(cameraStreams.value);
        next.set(uid, new MediaStream([publication.track.mediaStreamTrack]));
        cameraStreams.value = next;
      }
      if (publication?.kind === 'audio' && (publication?.source === (Track as any).Source.ScreenShareAudio || publication?.source === Track.Source.ScreenShare)) {
        const uid = resolveUserIdForIdentity(participant?.identity);
        if (!uid) return;
        // Do not play our own screen share audio locally
        if (appStore.currentUserId && uid === appStore.currentUserId) {
          return;
        }
        const track: any = publication?.track;
        if (!track?.attach) return;

        // If we already have an audio element for this user, just ensure it's playing and volume is applied
        const existing = screenShareAudioEls.value.get(uid);
        if (existing) {
          try { existing.play?.(); } catch {}
          applyVolumeToElement(uid, existing as HTMLMediaElement);
          return;
        }

        const el = track.attach();
        el.autoplay = true; el.muted = false; el.playsInline = true as any;
        try { el.play?.(); } catch {}
        // Apply user's volume setting
        applyVolumeToElement(uid, el as HTMLMediaElement);
        const next = new Map(screenShareAudioEls.value);
        next.set(uid, el as HTMLMediaElement);
        screenShareAudioEls.value = next;
      }
    } catch {}
  });

  // Listen for local track publications (when current user enables camera)
  if (livekitService.getLocalParticipant()) {
    const localParticipant = livekitService.getLocalParticipant()!;
    
    localParticipant.on('trackPublished', (publication) => {
      console.log('🎥 Local track published:', publication.source, publication.kind);
      if (publication.kind === 'video' && publication.source === Track.Source.Camera) {
        // Reflect camera state in shared UI when enabled from elsewhere
        isLocalCameraOn.value = true;
        // Force update streams when local camera is enabled
        setTimeout(() => updateLiveKitStreams(), 100);
      }
    });

    localParticipant.on('trackUnpublished', (publication) => {
      console.log('🎥 Local track unpublished:', publication.source, publication.kind);
      if (publication.kind === 'video' && publication.source === Track.Source.Camera) {
        // Reflect camera state in shared UI when disabled from elsewhere
        isLocalCameraOn.value = false;
        // Remove local camera stream when disabled
        const uid = appStore.currentUserId as number | null;
        if (uid) {
          const next = new Map(cameraStreams.value);
          next.delete(uid);
          cameraStreams.value = next;
          console.log('🎥 Removed local camera stream for user', uid);
        }
        // Force update streams to ensure UI reflects the change
        setTimeout(() => updateLiveKitStreams(), 100);
      }
    });
  }

  // React when local user stops screen share via browser UI
  livekitService.onLocalScreenShareStopped(async () => {

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
      // Update shared store immediately so buttons reflect the state
      try { appStore.handleUserStoppedScreenShare(channelId.value, uid); } catch {}
    }
    // Notify others via SignalR so participants clear loading
    try {
      await signalRService.stopScreenShare(route.params.serverId as string, channelId.value.toString());
    } catch (e) {

    }
    // Refresh streams and selection state
    setTimeout(() => updateLiveKitStreams(), 100);
    if (selectedParticipant.value && !(selectedParticipant.value.videoStream)) {
      selectedParticipant.value = null;
    }
  });

  // Subscribe to WebRTC remote streams to drive speaking indicator (voice audio)
  try {
    webrtcService.onRemoteStream((userId, stream) => {
      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          monitorAudioLevel(audioTrack, typeof userId === 'string' ? parseInt(userId as any, 10) : (userId as any as number));
        }
      } catch {}
    });
    // Also monitor local mic stream
    webrtcService.onLocalStream((stream) => {
      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack && appStore.currentUserId) {
          monitorAudioLevel(audioTrack, appStore.currentUserId);
        }
      } catch {}
    });
  } catch {}

  // Keep main video element attached to current screen-share track
  watch([mainScreenShare, screenShareTracks], () => {
    const m = mainScreenShare.value;
    const el = mainVideoRef.value;
    if (!el) return;
    try {
      // Detach any previously attached track
      screenShareTracks.value.forEach((t) => {
        try {
          (t as any).detach?.(el);
        } catch {
        }
      });
      if (m) {
        const t = screenShareTracks.value.get(m.id);
        if (t) {
          (t as any).attach?.(el);
        }
      }
    } catch {
    }
  });

  // Auto-focus on user if specified
  autoFocusUser();
});

onUnmounted(() => {
  // Cleanup speaking state and audio analyzers
  speakingTimeouts.value.forEach(timeout => clearTimeout(timeout));
  speakingTimeouts.value.clear();
  speakingUsers.value.clear();
  
  // Safely clear audio analyzers by closing their audio contexts
  activeAudioAnalyzers.value.forEach((analyser, userId) => {
    try {
      // Try to get the audio context from the analyser and close it
      const context = (analyser as any).context;
      if (context && typeof context.close === 'function') {
        context.close().catch(() => {});
      }
    } catch (error) {
      console.warn('Error closing audio context for user', userId, ':', error);
    }
  });
  activeAudioAnalyzers.value.clear();
  
  clearTimeout(hideControlsTimer);
  document.removeEventListener('mousemove', handleMouseMove);
});

// Ensure videos start playing after metadata loads (avoid TS in template)
const onVideoLoadedMetadata = (e: Event) => {
  const el = e.target as HTMLVideoElement | null;
  try {
    el?.play?.();
  } catch {
  }
};

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
