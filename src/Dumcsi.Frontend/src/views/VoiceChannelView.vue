<template>
  <div ref="voiceChannelViewRef" class="voice-channel-view flex h-full bg-bg-base">

    <!-- Show permission required component if microphone access is denied -->
    <MicrophonePermissionRequired 
      v-if="hasMicrophonePermission === false" 
      @permission-granted="handlePermissionGranted"
    />

    <!-- Show loading state while checking permissions -->
    <div v-else-if="isCheckingPermission" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Loader2 class="w-8 h-8 mx-auto mb-4 text-text-muted animate-spin"/>
        <p class="text-text-muted">Checking microphone permissions...</p>
      </div>
    </div>

    <!-- Main Voice View (only shown when permission is granted) -->
    <div v-else class="flex-1 flex flex-col relative">
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

      <!-- Unified Participant Grid with Embedded Streams -->
      <div 
        ref="voiceChannelContainer" 
        class="flex-1 p-4 overflow-hidden relative"
        :class="{ 'fullscreen-active': isFullscreen }"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      >
        <!-- No participants state -->
        <div v-if="participants.length === 0" class="h-full flex items-center justify-center">
          <div class="text-center">
            <Volume2 class="w-16 h-16 mx-auto mb-4 text-text-tertiary"/>
            <h3 class="text-lg font-medium text-text-default mb-2">No one else is here</h3>
            <p class="text-text-muted">Invite someone to start a conversation</p>
          </div>
        </div>

        <!-- Fullscreen View -->
        <div 
          v-else-if="isFullscreen && fullscreenParticipant" 
          class="fullscreen-container h-full flex flex-col bg-black rounded-lg overflow-hidden relative"
        >
          <!-- Fullscreen stream content -->
          <div class="flex-1 relative group" @click="exitFullscreen">
            <!-- Screen share video -->
            <video
              v-if="fullscreenParticipant.type === 'screen' && screenShareTracks.get(fullscreenParticipant.id)"
              ref="fullscreenVideoRef"
              autoplay
              muted
              playsinline
              class="w-full h-full object-contain cursor-pointer"
              @loadedmetadata="onVideoLoadedMetadata"
            />
            
            <!-- Camera video -->
            <video
              v-else-if="fullscreenParticipant.type === 'camera' && fullscreenParticipant.videoStream && isValidVideoStream(fullscreenParticipant.videoStream)"
              :srcObject="fullscreenParticipant.videoStream"
              autoplay
              muted
              playsinline
              class="w-full h-full object-cover cursor-pointer"
              @loadedmetadata="onVideoLoadedMetadata"
              @ended="onVideoEnded"
              @error="onVideoError"
            />

            <!-- Fullscreen info overlay -->
            <div class="absolute bottom-4 left-4 bg-black/70 rounded px-3 py-1">
              <span class="text-white text-sm font-medium">{{ fullscreenParticipant.username }}</span>
              <span class="text-white/70 text-xs ml-1">
                {{ fullscreenParticipant.type === 'screen' ? 'is sharing their screen' : 'camera' }}
              </span>
            </div>

            <!-- Volume control for fullscreen -->
            <div
              v-if="fullscreenParticipant.id !== appStore.currentUserId"
              class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <VolumeControl
                :volume="getUserVolume(fullscreenParticipant?.id || 0)"
                :user-id="fullscreenParticipant?.id || 0"
                :username="fullscreenParticipant?.username || ''"
                @volume-change="(vol) => fullscreenParticipant?.id && handleVolumeChange(fullscreenParticipant.id, vol)"
              />
            </div>

            <!-- Exit fullscreen hint -->
            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded px-2 py-1">
              <span class="text-white/70 text-xs">Click to exit fullscreen</span>
            </div>
          </div>
        </div>

        <!-- Participant Grid -->
        <div v-else class="h-full p-2">
          <div :class="gridLayoutClasses">
            <div
              v-for="participant in participants"
              :key="participant.id"
              :class="[
                'bg-main-800 rounded-lg overflow-hidden relative transition-all group',
                participantClasses,
                participant.isSpeaking 
                  ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/20'
                  : 'hover:ring-2 hover:ring-primary',
                (participant.hasScreenShare || participant.videoStream) ? 'cursor-pointer' : ''
              ]"
              @click="handleParticipantClick(participant)"
            >
              <div class="w-full h-full relative">
                <!-- Screen share video -->
                <template v-if="participant.hasScreenShare">
                  <video
                    v-if="screenShareTracks.get(participant.id)"
                    :ref="(el: any) => setParticipantVideoRef(el as HTMLVideoElement | null, participant.id, 'screen')"
                    autoplay
                    muted
                    playsinline
                    class="w-full h-full object-cover"
                    @loadedmetadata="onVideoLoadedMetadata"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center relative">
                    <UserAvatar 
                      :avatar-url="participant.avatar" 
                      :size="64"
                      :user-id="participant.id" 
                      :username="participant.username"
                    />
                    <!-- Screen share loading indicator -->
                    <div v-if="participant.isScreenShareLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                      <Loader2 class="animate-spin h-6 w-6 text-white mb-2" />
                      <span class="text-white text-xs">Starting screen share...</span>
                    </div>
                  </div>
                </template>

                <!-- Camera video -->
                <template v-else-if="participant.videoStream && isValidVideoStream(participant.videoStream)">
                  <video
                    :srcObject="participant.videoStream"
                    autoplay
                    muted
                    playsinline
                    class="w-full h-full object-cover"
                    @loadedmetadata="onVideoLoadedMetadata"
                    @ended="onVideoEnded"
                    @error="onVideoError"
                  />
                </template>

                <!-- Default user card (no stream) -->
                <template v-else>
                  <div class="w-full h-full flex items-center justify-center">
                    <UserAvatar 
                      :avatar-url="participant.avatar" 
                      :size="64"
                      :user-id="participant.id" 
                      :username="participant.username"
                    />
                  </div>
                </template>
              </div>

              <!-- User Info Overlay -->
              <div
                :class="{
                  'opacity-0 group-hover:opacity-100': participant.hasScreenShare || participant.videoStream,
                  'opacity-100': !(participant.hasScreenShare || participant.videoStream)
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
                    <!-- Screen sharing icon -->
                    <Monitor v-if="participant.isScreenSharing" class="w-3 h-3 text-blue-400" title="Screen Sharing"/>
                    <!-- Audio state icons -->
                    <VolumeX v-if="participant.isDeafened" class="w-3 h-3 text-red-400" title="Deafened"/>
                    <MicOff v-else-if="participant.isMuted" class="w-3 h-3 text-red-400" title="Muted"/>
                  </div>
                </div>
              </div>

              <!-- Click hint for streamable content -->
              <div 
                v-if="participant.hasScreenShare || participant.videoStream"
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded px-2 py-1"
              >
                <span class="text-white/70 text-xs">Click for fullscreen</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fullscreen Exit Button (mouse controlled) -->
        <button
          v-if="isFullscreen && showFullscreenControls"
          class="absolute top-4 right-4 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all z-50"
          @click="exitFullscreen"
          title="Exit fullscreen (Esc)"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Fullscreen Voice Controls (always visible at bottom) -->
        <div v-if="isFullscreen" class="absolute bottom-0 left-0 right-0 z-40">
          <div class="p-6">
            <div class="flex items-center justify-center gap-6">
              <!-- Primary Controls Group (Mic + Deafen) -->
              <div class="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
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

              <!-- Disconnect Button -->
              <div class="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <button
                  class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
                  title="Disconnect"
                  @click="disconnectVoice"
                >
                  <PhoneOff class="w-5 h-5 text-white"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- Auto-hiding Voice Controls (Non-Fullscreen) -->
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

      <!-- Voice Connection Details Modal -->
      <VoiceConnectionDetails
          :is-open="showVoiceSettings"
          @close="showVoiceSettings = false"
      />
    </div>
  </div>

  <!-- Context Menus (always shown regardless of permission state) -->
  <ContextMenu ref="cameraContextMenu" :items="cameraMenuItems" />
  <ContextMenu ref="screenShareContextMenu" :items="screenShareMenuItems" />
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
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
import { useWebcamSharing } from '@/composables/useWebcamSharing';
import {
  X,
  Lock,
  Loader2,
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
import VoiceConnectionDetails from '@/components/voice/VoiceConnectionDetails.vue';
import MicrophonePermissionRequired from '@/components/voice/MicrophonePermissionRequired.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import VolumeControl from '@/components/voice/VolumeControl.vue';
import {checkMicrophonePermission} from '@/utils/permissions';


const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const {addToast} = useToast();
const { resolutionOptions, fpsOptions, selectedQuality, selectedFPS, includeAudio, getCurrentSettings } = useScreenShareSettings();
const { getUserVolume, setUserVolume, applyVolumeToElement } = useScreenShareVolumeControl();

// Props from route params
const channelId = computed(() => parseInt(route.params.channelId as string));
// Note: serverId is available from route params but not currently used in this component

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

// Fullscreen state
const isFullscreen = ref(false);
const showFullscreenControls = ref(true);
const fullscreenParticipant = ref<{
  id: number;
  username: string;
  avatar?: string | null;
  type: 'camera' | 'screen';
  videoStream?: MediaStream;
} | null>(null);
const voiceChannelContainer = ref<HTMLElement | null>(null);
const fullscreenVideoRef = ref<HTMLVideoElement | null>(null);

let fullscreenControlsTimer: number;
let mouseActivityTimer: number;

// Permission state
const hasMicrophonePermission = ref<boolean | null>(null); // null = checking, true = granted, false = denied
const isCheckingPermission = ref(true);
// Helper to provide a stable LiveKit identity
const getLiveKitIdentity = () => String(appStore.currentUserId ?? '');

// Check microphone permissions
const checkPermissions = async () => {
  isCheckingPermission.value = true;
  try {
    const result = await checkMicrophonePermission();
    hasMicrophonePermission.value = result.granted;
  } catch (error) {
    console.error('Failed to check microphone permission:', error);
    hasMicrophonePermission.value = false;
  } finally {
    isCheckingPermission.value = false;
  }
};

// Voice channel initialization logic
const initializeVoiceChannel = async () => {
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
      await livekitService.ensureConnected(channelId.value, getLiveKitIdentity());
      attachLocalParticipantCameraListeners();
    } catch {}
  }

  // Update streams from LiveKit once connected
  if (livekitService.isRoomConnected()) {
    updateLiveKitStreams();
  }
};

// Handle permission granted from the permission component
const handlePermissionGranted = async () => {
  hasMicrophonePermission.value = true;
  // Now we can proceed with normal voice channel initialization
  await initializeVoiceChannel();
};

// Voice controls state (centralized)
const { isCameraOn, toggleCamera, hotSwitchCamera, initializeCameraState } = useWebcamSharing();

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

// Track end listeners for camera MediaStreamTracks so we can clean stale streams
const cameraTrackEndListeners = ref<Map<number, () => void>>(new Map());

// Safely map a camera MediaStreamTrack to a participant, skipping ended tracks and
// auto-removing the mapping when the track ends.
const setCameraStream = (userId: number, mediaTrack: MediaStreamTrack | null) => {
  console.log(`setCameraStream called for user ${userId}:`, {
    trackId: mediaTrack?.id,
    readyState: (mediaTrack as any)?.readyState,
    hasTrack: !!mediaTrack
  });
  
  // Remove previous 'ended' listener if any
  const prevOff = cameraTrackEndListeners.value.get(userId);
  if (prevOff) {
    try { prevOff(); } catch {}
    cameraTrackEndListeners.value.delete(userId);
  }

  // Clean up existing stream first
  const existingStream = cameraStreams.value.get(userId);
  if (existingStream) {
    console.log(`Cleaning up existing camera stream for user ${userId}`);
    existingStream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Failed to stop existing camera track:', error);
      }
    });
  }

  if (!mediaTrack) {
    const next = new Map(cameraStreams.value);
    next.delete(userId);
    cameraStreams.value = next;
    console.log(`Camera stream removed for user ${userId}`);
    return;
  }

  // Skip tracks that are already ended
  if ((mediaTrack as any).readyState === 'ended') {
    console.warn(`Skipping ended track for user ${userId}, readyState: ${(mediaTrack as any).readyState}`);
    const next = new Map(cameraStreams.value);
    next.delete(userId);
    cameraStreams.value = next;
    return;
  }

  const stream = new MediaStream([mediaTrack]);
  const next = new Map(cameraStreams.value);
  next.set(userId, stream);
  cameraStreams.value = next;
  console.log(`Camera stream set for user ${userId} with track ID: ${mediaTrack.id}`);

  const onEnded = () => {
    console.log(`Camera track ended for user ${userId}`);
    const n = new Map(cameraStreams.value);
    n.delete(userId);
    cameraStreams.value = n;
    // Clean up the ended listener
    cameraTrackEndListeners.value.delete(userId);
  };
  try {
    mediaTrack.addEventListener('ended', onEnded, { once: true } as any);
    cameraTrackEndListeners.value.set(userId, () => mediaTrack.removeEventListener('ended', onEnded));
  } catch {
    // ignore
  }
};

// Retry helper: map camera track from a publication with small backoff if track is not ready yet
const tryMapCameraFromPublication = (userId: number, publication: any, attempts = 5, delayMs = 200) => {
  const mapNow = () => {
    const mt: MediaStreamTrack | undefined = publication?.track?.mediaStreamTrack;
    if (mt && (mt as any).readyState !== 'ended') {
      console.log(`Mapping camera track for user ${userId}, readyState: ${(mt as any).readyState}`);
      setCameraStream(userId, mt);
      return true;
    }
    if (mt) {
      console.warn(`Skipping ended camera track for user ${userId}, readyState: ${(mt as any).readyState}`);
    }
    return false;
  };

  if (mapNow()) return;
  if (attempts <= 0) {
    console.warn(`Failed to map camera track for user ${userId} after ${5} attempts`);
    return;
  }

  setTimeout(() => {
    tryMapCameraFromPublication(userId, publication, attempts - 1, delayMs);
  }, delayMs);
};

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

// Grid layout classes
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

// Video refs management for participant videos
const participantVideoRefs = ref<Map<string, HTMLVideoElement>>(new Map());

const setParticipantVideoRef = (el: HTMLVideoElement | null, participantId: number, type: 'screen' | 'camera') => {
  const key = `${participantId}-${type}`;

  if (el) {
    participantVideoRefs.value.set(key, el);
    // Attach screen share track if available
    if (type === 'screen') {
      const track = screenShareTracks.value.get(participantId);
      if (track) {
        try {
          (track as any).attach?.(el);
        } catch (error) {
          console.warn('Failed to attach screen share track:', error);
        }
      }
    }
  } else {
    const existing = participantVideoRefs.value.get(key);
    if (existing && type === 'screen') {
      const track = screenShareTracks.value.get(participantId);
      if (track) {
        try {
          (track as any).detach?.(existing);
        } catch (error) {
          console.warn('Failed to detach screen share track:', error);
        }
      }
    }
    participantVideoRefs.value.delete(key);
  }
};


// Volume control handler
const handleVolumeChange = (userId: number, volume: number) => {
  setUserVolume(userId, volume);

  // Apply volume to the audio element if it exists
  const audioElement = screenShareAudioEls.value.get(userId);
  if (audioElement) {
    applyVolumeToElement(userId, audioElement);
  }
};

// Fullscreen functionality
const handleParticipantClick = (participant: any) => {
  // Only allow fullscreen for participants with active streams
  if (!participant.hasScreenShare && !participant.videoStream) {
    return; // Do nothing for participants without streams
  }

  // Determine stream type and set fullscreen participant
  const streamType = participant.hasScreenShare ? 'screen' : 'camera';

  fullscreenParticipant.value = {
    id: participant.id,
    username: participant.username,
    avatar: participant.avatar,
    type: streamType,
    videoStream: participant.videoStream
  };

  enterFullscreen();
};

const enterFullscreen = async () => {
  if (!voiceChannelContainer.value || !fullscreenParticipant.value) return;

  try {
    await voiceChannelContainer.value.requestFullscreen();
  } catch (error) {
    console.warn('Fullscreen request failed:', error);
    // Fallback to pseudo-fullscreen
    isFullscreen.value = true;
    showFullscreenControls.value = true;
    attachFullscreenVideo();
  }
};

const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      // Fallback for pseudo-fullscreen
      isFullscreen.value = false;
      fullscreenParticipant.value = null;
    }
  } catch (error) {
    console.warn('Exit fullscreen failed:', error);
    // Fallback
    isFullscreen.value = false;
    fullscreenParticipant.value = null;
  }
};

const attachFullscreenVideo = () => {
  if (!fullscreenParticipant.value || !fullscreenVideoRef.value) return;

  // Attach screen share track to fullscreen video element
  if (fullscreenParticipant.value.type === 'screen') {
    const track = screenShareTracks.value.get(fullscreenParticipant.value.id);
    if (track) {
      try {
        (track as any).attach?.(fullscreenVideoRef.value);
      } catch (error) {
        console.warn('Failed to attach fullscreen video:', error);
      }
    }
  }
};

const handleFullscreenChange = () => {
  const wasFullscreen = isFullscreen.value;
  isFullscreen.value = !!document.fullscreenElement;

  if (isFullscreen.value && !wasFullscreen) {
    // Entering fullscreen
    showFullscreenControls.value = true;
    // Attach video track if screen share
    setTimeout(() => attachFullscreenVideo(), 100);

    // Start hide timer
    clearTimeout(fullscreenControlsTimer);
    fullscreenControlsTimer = setTimeout(() => {
      showFullscreenControls.value = false;
    }, 3000);
  } else if (!isFullscreen.value && wasFullscreen) {
    // Exiting fullscreen
    fullscreenParticipant.value = null;
    showFullscreenControls.value = true;
    clearTimeout(fullscreenControlsTimer);
  }
};

const handleMouseMove = (event?: MouseEvent) => {
  // Handle fullscreen mouse movement
  if (isFullscreen.value) {
    showFullscreenControls.value = true;
    clearTimeout(fullscreenControlsTimer);

    fullscreenControlsTimer = setTimeout(() => {
      showFullscreenControls.value = false;
    }, 3000);
  }

  // Handle non-fullscreen mouse movement for auto-hiding controls
  if (event && !isFullscreen.value) {
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
  }
};

const handleMouseLeave = () => {
  if (isFullscreen.value) {
    clearTimeout(mouseActivityTimer);
    mouseActivityTimer = setTimeout(() => {
      showFullscreenControls.value = false;
    }, 100);
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    exitFullscreen();
  }
};

// Ensure videos start playing after metadata loads
const onVideoLoadedMetadata = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  try {
    video.play();
  } catch (error) {
    console.warn('Failed to play video:', error);
  }
};

// Handle video stream ended
const onVideoEnded = (event: Event) => {
  const video = event.target as HTMLVideoElement;

  // Clear the srcObject to prevent black video
  if (video.srcObject) {
    const stream = video.srcObject as MediaStream;
    // Stop all tracks in the stream
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Failed to stop video track:', error);
      }
    });
    video.srcObject = null;
  }

  // Force a UI update to ensure we revert to avatar
  setTimeout(() => updateLiveKitStreams(), 100);
};

// Handle video errors
const onVideoError = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.warn('Video error occurred:', event);

  // Clear the srcObject to prevent stuck video
  if (video.srcObject) {
    const stream = video.srcObject as MediaStream;
    // Stop all tracks in the stream
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Failed to stop video track on error:', error);
      }
    });
    video.srcObject = null;
  }

  // Force a UI update
  setTimeout(() => updateLiveKitStreams(), 100);
};

// Check if video stream is valid and has active tracks
const isValidVideoStream = (stream: MediaStream): boolean => {
  if (!stream) return false;

  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length === 0) return false;

  // Check if at least one video track is not ended
  return videoTracks.some(track => track.readyState !== 'ended' && track.enabled);
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

// Camera toggle is now handled by the centralized composable

const toggleScreenShare = async () => {
  if (isScreenShareLoading.value) return;

  // Ensure LiveKit connection
  try {
    await livekitService.ensureConnected(channelId.value, getLiveKitIdentity());
  } catch {
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


const handleControlsMouseEnter = () => {
  showControls.value = true;
};

const handleControlsMouseLeave = () => {
  if (!controlsLocked.value) {
    showControls.value = false;
  }
};


// Attach local participant listeners to keep camera state/streams in sync
const attachLocalParticipantCameraListeners = () => {
  try {
    const localParticipant = livekitService.getLocalParticipant();
    if (!localParticipant) return;
    localParticipant.on('trackPublished', (publication: any) => {
      if (publication?.source === Track.Source.Camera) {
        // Camera state is handled by the centralized composable
        setTimeout(() => updateLiveKitStreams(), 100);
      }
    });
    localParticipant.on('trackUnpublished', (publication: any) => {
      if (publication?.source === Track.Source.Camera) {
        // Camera state is handled by the centralized composable
        const uid = appStore.currentUserId as number | null;
        if (uid) {
          const next = new Map(cameraStreams.value);
          next.delete(uid);
          cameraStreams.value = next;
        }
        setTimeout(() => updateLiveKitStreams(), 100);
      }
    });
  } catch {}
};

// LiveKit connection is handled via livekitService.ensureConnected where needed

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
      } else if (pub.kind === 'video' && pub.track?.mediaStreamTrack && pub.source === Track.Source.Camera) {
        // Include camera streams; skip ended
        if ((pub.track.mediaStreamTrack as any).readyState !== 'ended') {
          newCamMap.set(uid, new MediaStream([pub.track.mediaStreamTrack]));
        }
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
      } else if (pub.kind === 'video' && pub.track?.mediaStreamTrack && pub.source === Track.Source.Camera) {
        // Handle local camera track; skip ended
        if ((pub.track.mediaStreamTrack as any).readyState !== 'ended') {
          newCamMap.set(uid, new MediaStream([pub.track.mediaStreamTrack]));
        }
      }
      });
    }
  }

  // Log changes for debugging
  const oldCamCount = cameraStreams.value.size;
  const newCamCount = newCamMap.size;
  if (oldCamCount !== newCamCount) {
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
        livekitService.ensureConnected(channelId.value, getLiveKitIdentity()).then(() => {
          // After connecting, update streams soon after join
          setTimeout(() => updateLiveKitStreams(), 500);
        }).catch(() => {

        });
      } else {
        // Force update streams when screen sharing state changes
        updateLiveKitStreams();
      }

      // Auto-selection is now handled by the UnifiedVideoPreview component
      if (current.size > 0) {
        // No need to manually select here - UnifiedVideoPreview handles this
      }

      // If no one is sharing anymore, clear states
      if (current.size === 0) {

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

    },
    {immediate: true}
);

// Refresh mapped streams when participants change
watch(() => participants.value.map(p => p.id).join(','), () => updateLiveKitStreams());

// Watch camera streams for debugging and cleanup
watch(() => cameraStreams.value, (newStreams, oldStreams) => {
  const newIds = Array.from(newStreams.keys()).sort();
  const oldIds = oldStreams ? Array.from(oldStreams.keys()).sort() : [];

  if (newIds.join(',') !== oldIds.join(',')) {

    // Clean up removed streams
    if (oldStreams) {
      oldStreams.forEach((stream, userId) => {
        if (!newStreams.has(userId)) {
          // Stop all tracks in the removed stream
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (error) {
              console.warn('Failed to stop camera track:', error);
            }
          });
        }
      });
    }
  }
}, { deep: true });

// Hold references to LiveKit event handlers so we can unregister on unmount
let lkOnTrackSub: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void) | null = null;
let lkOnTrackUnsub: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void) | null = null;
let lkOnParticipantDisc: ((participant: RemoteParticipant) => void) | null = null;
let lkOnTrackMuted: ((publication: any, participant: any) => void) | null = null;
let lkOnTrackUnmuted: ((publication: any, participant: any) => void) | null = null;
let lkOnLocalScreenStopped: (() => void) | null = null;

onMounted(async () => {
  // Initialize centralized camera state
  initializeCameraState();
  // Attach local participant listeners if already connected
  attachLocalParticipantCameraListeners();
  
  // Add fullscreen and keyboard event listeners
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('keydown', handleKeydown);
  
  // First check microphone permissions
  await checkPermissions();
  
  // Only proceed with voice channel initialization if permission is granted
  if (hasMicrophonePermission.value) {
    await initializeVoiceChannel();
  }

  // LiveKit events: update media maps in real time
  lkOnTrackSub = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;

    console.log(`Track subscribed for user ${uid}:`, {
      trackKind: track.kind,
      source: publication.source,
      trackId: (track as any).mediaStreamTrack?.id,
      readyState: (track as any).mediaStreamTrack?.readyState
    });

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
    } else if (publication.kind === 'video' && publication.track && publication.source === Track.Source.Camera) {
      // Map immediately if track is valid; otherwise retry a few times as devices/track restarts can race
      tryMapCameraFromPublication(uid, publication as any, 6, 200);
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

  lkOnTrackUnsub = (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const uid = resolveUserIdForIdentity(participant.identity);
    if (!uid) return;
    
    console.log(`Track unsubscribed for user ${uid}:`, {
      trackKind: publication.kind,
      source: publication.source,
      trackId: (_track as any).mediaStreamTrack?.id,
      readyState: (_track as any).mediaStreamTrack?.readyState
    });
    
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
      console.log(`Removing camera stream for user ${uid}`);
      const next = new Map(cameraStreams.value);
      next.delete(uid);
      cameraStreams.value = next;
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

  lkOnParticipantDisc = (participant: RemoteParticipant) => {
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

  livekitService.onTrackSubscribed(lkOnTrackSub);
  livekitService.onTrackUnsubscribed(lkOnTrackUnsub);
  livekitService.onParticipantDisconnected(lkOnParticipantDisc);

  // React to mute/unmute of camera tracks (including local)
  lkOnTrackMuted = (publication: any, participant: any) => {
    try {
      const uid = resolveUserIdForIdentity(participant?.identity);
      if (!uid) return;

      // Avoid removing our own camera stream on transient mute events during (re)publish.
      // This was causing the local preview to flash and disappear on second enable.
      if (
        publication?.kind === 'video' &&
        publication?.source === Track.Source.Camera &&
        uid !== appStore.currentUserId
      ) {
        const next = new Map(cameraStreams.value);
        next.delete(uid);
        cameraStreams.value = next;
      }

      if (
        publication?.kind === 'audio' &&
        ((publication?.source === (Track as any).Source.ScreenShareAudio) || publication?.source === Track.Source.ScreenShare)
      ) {
        const el = screenShareAudioEls.value.get(uid);
        if (el) { try { el.pause?.(); } catch {} }
        const next = new Map(screenShareAudioEls.value);
        next.delete(uid);
        screenShareAudioEls.value = next;
      }
    } catch {}
  };
  livekitService.onTrackMuted(lkOnTrackMuted);

  lkOnTrackUnmuted = (publication: any, participant: any) => {
    try {
      if (publication?.kind === 'video' && publication?.source === Track.Source.Camera && publication?.track) {
        const uid = resolveUserIdForIdentity(participant?.identity);
        if (!uid) return;
        // Map now or retry until a valid mediaStreamTrack becomes available
        tryMapCameraFromPublication(uid, publication, 6, 200);
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
  };
  livekitService.onTrackUnmuted(lkOnTrackUnmuted);

  // Camera state is managed by the shared composable, but we still need to update streams
  if (livekitService.getLocalParticipant()) {
    const localParticipant = livekitService.getLocalParticipant()!;
    
    localParticipant.on('trackPublished', (publication) => {
      if (publication.kind === 'video' && publication.source === Track.Source.Camera) {
        // Force update streams when local camera is enabled
        setTimeout(() => updateLiveKitStreams(), 100);
      }
    });

    localParticipant.on('trackUnpublished', (publication) => {
      if (publication.kind === 'video' && publication.source === Track.Source.Camera) {
        // Remove local camera stream when disabled
        const uid = appStore.currentUserId as number | null;
        if (uid) {
          const next = new Map(cameraStreams.value);
          next.delete(uid);
          cameraStreams.value = next;
        }
        // Force update streams to ensure UI reflects the change
        setTimeout(() => updateLiveKitStreams(), 100);
      }
    });
  }

  // React when local user stops screen share via browser UI
  lkOnLocalScreenStopped = async () => {

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
    // Refresh streams
    setTimeout(() => updateLiveKitStreams(), 100);
  };
  livekitService.onLocalScreenShareStopped(lkOnLocalScreenStopped);

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


});

// Keep preview responsive to camera being turned on
watch(() => isCameraOn.value, (on) => {
  if (on) {
    setTimeout(() => updateLiveKitStreams(), 150);
  }
});

// Hot-switch camera when device or quality changes while camera is on
watch([
  () => selectedCamQuality.value.value,
  () => selectedDeviceId.value
], async () => {
  if (!isCameraOn.value) return;
  try {
    const w = selectedCamQuality.value.width;
    const h = selectedCamQuality.value.height;
    await hotSwitchCamera(selectedDeviceId.value || undefined, w, h);
    setTimeout(() => updateLiveKitStreams(), 150);
  } catch {
    // noop
  }
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
  
  // Cleanup timers and event listeners
  clearTimeout(hideControlsTimer);
  clearTimeout(fullscreenControlsTimer);
  clearTimeout(mouseActivityTimer);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('keydown', handleKeydown);
  
  // Detach video tracks
  participantVideoRefs.value.forEach((videoEl, key) => {
    const [userIdStr, type] = key.split('-');
    const userId = parseInt(userIdStr);
    
    if (type === 'screen') {
      const track = screenShareTracks.value.get(userId);
      if (track) {
        try {
          (track as any).detach?.(videoEl);
        } catch (error) {
          console.warn('Failed to detach track:', error);
        }
      }
    }
  });

  // Cleanup camera track 'ended' listeners
  try {
    cameraTrackEndListeners.value.forEach(off => { try { off(); } catch {} });
    cameraTrackEndListeners.value.clear();
  } catch {}

  // Unregister LiveKit callbacks to avoid duplicate handlers on remount
  try {
    if (lkOnTrackSub) livekitService.offTrackSubscribed(lkOnTrackSub);
    if (lkOnTrackUnsub) livekitService.offTrackUnsubscribed(lkOnTrackUnsub);
    if (lkOnParticipantDisc) livekitService.offParticipantDisconnected(lkOnParticipantDisc);
    if (lkOnTrackMuted) livekitService.offTrackMuted(lkOnTrackMuted);
    if (lkOnTrackUnmuted) livekitService.offTrackUnmuted(lkOnTrackUnmuted);
    if (lkOnLocalScreenStopped) livekitService.offLocalScreenShareStopped(lkOnLocalScreenStopped);
  } catch {}
  lkOnTrackSub = null; lkOnTrackUnsub = null; lkOnParticipantDisc = null; lkOnTrackMuted = null; lkOnTrackUnmuted = null; lkOnLocalScreenStopped = null;
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

/* Fullscreen styles */
.fullscreen-active {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: black;
}

.fullscreen-container {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Ensure fullscreen video takes full space */
.fullscreen-container video {
  width: 100%;
  height: 100%;
}
</style>
