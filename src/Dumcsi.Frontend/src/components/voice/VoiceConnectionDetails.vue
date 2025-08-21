<template>
  <BaseModal
    :model-value="isOpen"
    title="Connection Details"
    @close="$emit('close')"
  >
    <!-- Tab Navigation -->
    <div class="flex border-b border-border-default mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :disabled="tab.disabled"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors relative',
          activeTab === tab.id 
            ? 'text-primary border-b-2 border-primary' 
            : tab.disabled 
              ? 'text-text-tertiary cursor-not-allowed' 
              : 'text-text-secondary hover:text-text-default'
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4 inline mr-2" />
        {{ tab.label }}
        <span v-if="tab.count > 0" class="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
          {{ tab.count }}
        </span>
      </button>
    </div>

    <div class="space-y-4 text-sm">
      <!-- Voice Tab Content -->
      <div v-if="activeTab === 'voice'" class="space-y-4">
        <!-- Connection Status -->
        <div class="bg-main-900 p-3 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <div :class="[
              'w-2 h-2 rounded-full',
              connectionQuality === 'excellent' ? 'bg-green-500' :
              connectionQuality === 'good' ? 'bg-yellow-500' :
              connectionQuality === 'poor' ? 'bg-red-500' : 'bg-gray-500'
            ]"></div>
            <span class="font-medium text-text-default">{{ connectionStatus }}</span>
          </div>
          <div class="text-xs text-text-muted">
            Connected for {{ connectedDuration }}
          </div>
        </div>

        <!-- Connection Info -->
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-text-muted">Server:</span>
            <span class="text-text-default">{{ serverUrl }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-text-muted">Channel:</span>
            <span class="text-text-default">{{ channelName }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-text-muted">Participants:</span>
            <span class="text-text-default">{{ participantCount }}</span>
          </div>
        </div>

        <!-- Technical Details -->
        <div class="border-t border-border-default pt-4 space-y-3">
          <div class="flex justify-between">
            <span class="text-text-muted">Audio Codec:</span>
            <span class="text-text-default">Opus</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-text-muted">Outgoing Bitrate:</span>
            <span class="text-text-default">{{ audioBitrateOut }} kbps</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-muted">Incoming Bitrate:</span>
            <span class="text-text-default">{{ audioBitrateIn }} kbps</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-text-muted">Latency:</span>
            <span class="text-text-default">{{ latency }}ms</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-text-muted">Packet Loss:</span>
            <span class="text-text-default">{{ packetLoss }}%</span>
          </div>
        </div>
      </div>

      <!-- Screen Share Tab Content -->
      <div v-else-if="activeTab === 'screen'" class="space-y-4">
        <div v-if="activeScreenShares.length === 0" class="text-center py-8 text-text-muted">
          <Monitor class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No active screen shares</p>
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="share in activeScreenShares" :key="share.userId" class="bg-main-900 p-3 rounded-lg">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Monitor class="w-4 h-4 text-white" />
              </div>
              <div>
                <div class="font-medium text-text-default">{{ share.username }}</div>
                <div class="text-xs text-text-muted">Screen sharing</div>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-text-muted">Resolution:</span>
                <span class="text-text-default">{{ share.resolution }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-text-muted">Frame Rate:</span>
                <span class="text-text-default">{{ share.frameRate }} FPS</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-text-muted">Audio:</span>
                <span class="text-text-default">{{ share.hasAudio ? 'Included' : 'None' }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-text-muted">Bitrate:</span>
                <span class="text-text-default">{{ share.bitrate }} kbps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Webcam Tab Content -->
      <div v-else-if="activeTab === 'webcam'" class="space-y-4">
        <div v-if="activeCameras.length === 0" class="text-center py-8 text-text-muted">
          <Video class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No active webcams</p>
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="camera in activeCameras" :key="camera.userId" class="bg-main-900 p-3 rounded-lg">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <Video class="w-4 h-4 text-white" />
              </div>
              <div>
                <div class="font-medium text-text-default">{{ camera.username }}</div>
                <div class="text-xs text-text-muted">Camera active</div>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-text-muted">Resolution:</span>
                <span class="text-text-default">{{ camera.resolution }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-text-muted">Frame Rate:</span>
                <span class="text-text-default">{{ camera.frameRate }} FPS</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-text-muted">Device:</span>
                <span class="text-text-default">{{ camera.deviceName }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-text-muted">Bitrate:</span>
                <span class="text-text-default">{{ camera.bitrate }} kbps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import BaseModal from '@/components/modals/BaseModal.vue';
import { livekitService } from '@/services/livekitService';
import { webrtcService } from '@/services/webrtcService';
import { useAppStore } from '@/stores/app';
import { Mic, Monitor, Video } from 'lucide-vue-next';
import { Track } from 'livekit-client';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const appStore = useAppStore();

// Tab system - always start with voice tab
const activeTab = ref<'voice' | 'screen' | 'webcam'>('voice');

// Reset to voice tab whenever modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'voice';
  }
});

// Live voice connection stats (aggregated from SimplePeer/RTCPeerConnection)
const connectionQuality = ref<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
const audioBitrateIn = ref(0); // kbps (inbound)
const audioBitrateOut = ref(0); // kbps (outbound)
const latency = ref(0); // ms
const packetLoss = ref(0); // percent

// Reactive clock for live duration updates
const nowTs = ref(Date.now());

// Connected duration formatting (live)
const connectedDuration = computed(() => {
  const since = webrtcService.getVoiceConnectedAt();
  if (!since) return '—';
  const diff = Math.max(0, nowTs.value - since);
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
});

const connectionStatus = computed(() => {
  switch (connectionQuality.value) {
    case 'excellent': return 'Voice Connected - Excellent';
    case 'good': return 'Voice Connected - Good';
    case 'poor': return 'Voice Connected - Poor';
    default: return 'Voice Connected';
  }
});

const serverUrl = computed(() => {
  return import.meta.env.VITE_LIVEKIT_URL || 'ws://192.168.0.50:7880';
});

const channelName = computed(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId || !appStore.currentServer) return 'Unknown Channel';
  
  const channel = appStore.currentServer.channels.find(c => c.id === channelId);
  return channel?.name || 'Voice Channel';
});

const participantCount = computed(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId) return 0;
  const users = appStore.voiceChannelUsers.get(channelId) || [];
  return users.length;
});

// Screen sharing and webcam data
interface ScreenShareInfo {
  userId: number;
  username: string;
  resolution: string;
  frameRate: number;
  hasAudio: boolean;
  bitrate: string;
}

interface CameraInfo {
  userId: number;
  username: string;
  resolution: string;
  frameRate: number;
  deviceName: string;
  bitrate: string;
}

// Runtime stats cache for screen shares (populated via WebRTC receiver stats)
const screenShareRuntime = ref(new Map<number, { resolution?: string; frameRate?: number; hasAudio?: boolean; kbps?: number }>());
const screenSharePrev = ref(new Map<number, { bytes: number; ts: number }>());

const activeScreenShares = computed<ScreenShareInfo[]>(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId) return [];

  const screenShareUsers = appStore.screenShares.get(channelId) || new Set();
  const voiceUsers = appStore.voiceChannelUsers.get(channelId) || [];
  return Array.from(screenShareUsers).map(userId => {
    const user = voiceUsers.find(u => u.id === userId);
    if (!user) return null;
    const rt = screenShareRuntime.value.get(userId) || {};
    const bitrateStr = typeof rt.kbps === 'number' ? Math.round(rt.kbps).toString() : '—';
    return {
      userId,
      username: user.username,
      resolution: rt.resolution ?? '—',
      frameRate: rt.frameRate ?? 0,
      hasAudio: rt.hasAudio ?? false,
      bitrate: typeof rt.kbps === 'number' ? bitrateStr : '—'
    };
  }).filter((item): item is ScreenShareInfo => item !== null);
});

const activeCameras = computed<CameraInfo[]>(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId) return [];

  const voiceUsers = appStore.voiceChannelUsers.get(channelId) || [];
  
  // Get users who actually have camera streams active
  // Check LiveKit room for actual camera tracks
  const room = livekitService.getRoom();
  if (!room || !livekitService.isRoomConnected()) return [];
  
  const activeCameraUsers: CameraInfo[] = [];
  
  // Check local participant's camera
  const localParticipant = room.localParticipant;
  const localCameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
  // Camera is active if track exists, is not muted, and track is actually enabled
  if (localCameraTrack && localCameraTrack.track && !localCameraTrack.isMuted && localCameraTrack.track.mediaStreamTrack && localCameraTrack.track.mediaStreamTrack.enabled && localCameraTrack.track.mediaStreamTrack.readyState === 'live') {
    const localUser = voiceUsers.find(u => u.id === appStore.currentUserId);
    if (localUser) {
      const settings = localCameraTrack.track.mediaStreamTrack.getSettings?.() as MediaTrackSettings | undefined;
      const w = settings?.width ?? 0;
      const h = settings?.height ?? 0;
      const fr = typeof settings?.frameRate === 'number' ? Math.round(settings!.frameRate as number) : 0;
      const label = localCameraTrack.track.mediaStreamTrack.label || 'Camera';
      activeCameraUsers.push({
        userId: localUser.id,
        username: localUser.username,
        resolution: (w && h) ? `${w}×${h}` : '—',
        frameRate: fr,
        deviceName: label,
        bitrate: '—'
      });
    }
  }
  
  // Check remote participants' cameras
  room.remoteParticipants.forEach(participant => {
    const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
    // Camera is active if track exists, is subscribed, not muted, and track is actually live
    if (cameraTrack && cameraTrack.track && cameraTrack.isSubscribed && !cameraTrack.isMuted && cameraTrack.track.mediaStreamTrack && cameraTrack.track.mediaStreamTrack.readyState === 'live') {
      // Match participant identity to our user data - try multiple matching strategies
      const user = voiceUsers.find(u => 
        u.username === participant.identity || 
        u.id.toString() === participant.identity ||
        `user_${u.id}` === participant.identity
      );
      if (user) {
        const settings = cameraTrack.track.mediaStreamTrack.getSettings?.() as MediaTrackSettings | undefined;
        const w = settings?.width ?? 0;
        const h = settings?.height ?? 0;
        const fr = typeof settings?.frameRate === 'number' ? Math.round(settings!.frameRate as number) : 0;
        const label = cameraTrack.track.mediaStreamTrack.label || 'Camera';
        activeCameraUsers.push({
          userId: user.id,
          username: user.username,
          resolution: (w && h) ? `${w}×${h}` : '—',
          frameRate: fr,
          deviceName: label,
          bitrate: '—'
        });
      }
    }
  });
  
  return activeCameraUsers;
});

// Tab configuration
const tabs = computed(() => [
  {
    id: 'voice' as const,
    label: 'Voice',
    icon: Mic,
    disabled: false,
    count: participantCount.value
  },
  {
    id: 'screen' as const,
    label: 'Screen Share',
    icon: Monitor,
    disabled: activeScreenShares.value.length === 0,
    count: activeScreenShares.value.length
  },
  {
    id: 'webcam' as const,
    label: 'Webcam',
    icon: Video,
    disabled: activeCameras.value.length === 0,
    count: activeCameras.value.length
  }
]);

// Watcher to auto-switch back to Voice tab when screen sharing stops
watch(() => activeScreenShares.value.length, (newCount, oldCount) => {
  // If we were on the screen tab and screen shares went to 0, switch back to voice
  if (activeTab.value === 'screen' && newCount === 0 && oldCount > 0) {
    activeTab.value = 'voice';
  }
});

// TODO: Replace with actual LiveKit connection statistics
onMounted(() => {
  let statsInterval: number | undefined;
  let clockInterval: number | undefined;
  let screenInterval: number | undefined;
  const updateStats = async () => {
    try {
      const stats = await webrtcService.getAggregatedAudioStats();
      audioBitrateIn.value = stats.inboundKbps;
      audioBitrateOut.value = stats.outboundKbps;
      latency.value = stats.latencyMs;
      packetLoss.value = stats.packetLossPct;
      // Quality derived from network health only (avoid penalizing silence/PTT)
      if (packetLoss.value >= 5 || latency.value >= 300) connectionQuality.value = 'poor';
      else if (packetLoss.value >= 1.5 || latency.value >= 150) connectionQuality.value = 'good';
      else connectionQuality.value = 'excellent';
    } catch {
      // Keep previous values if stats fail
    }
  };

  const startIntervals = () => {
    clockInterval = window.setInterval(() => { nowTs.value = Date.now(); }, 1000);
    updateStats();
    statsInterval = window.setInterval(updateStats, 2000);
    updateScreenShares();
    screenInterval = window.setInterval(updateScreenShares, 2000);
  };
  const stopIntervals = () => {
    if (statsInterval) window.clearInterval(statsInterval);
    if (clockInterval) window.clearInterval(clockInterval);
    if (screenInterval) window.clearInterval(screenInterval);
    statsInterval = undefined;
    clockInterval = undefined;
    screenInterval = undefined;
  };
  const updateScreenShares = async () => {
    try {
      const room = livekitService.getRoom();
      const channelId = appStore.currentVoiceChannelId;
      if (!room || !livekitService.isRoomConnected() || !channelId) return;
      const screenShareUsers = appStore.screenShares.get(channelId) || new Set<number>();
      const voiceUsers = appStore.voiceChannelUsers.get(channelId) || [];
      for (const userId of screenShareUsers) {
        const user = voiceUsers.find(u => u.id === userId);
        if (!user) continue;
        const participant = room.remoteParticipants.get(String(user.username))
          || room.remoteParticipants.get(String(user.id))
          || room.remoteParticipants.get(`user_${user.id}`)
          || (room.localParticipant.identity === String(user.username)
              || room.localParticipant.identity === String(user.id)
              || room.localParticipant.identity === `user_${user.id}`
              ? room.localParticipant : undefined as any);
        const pub = participant?.getTrackPublication(Track.Source.ScreenShare);
        const pubAudio = participant?.getTrackPublication(Track.Source.ScreenShareAudio);
        // Ensure subscribed so track exists
        try { (pub as any)?.setSubscribed?.(true); } catch {}
        try { (pubAudio as any)?.setSubscribed?.(true); } catch {}
        const track: any = pub?.track;
        let width: number | undefined;
        let height: number | undefined;
        let fps: number | undefined;
        let kbpsComputed: number | undefined;
        // Try receiver stats (remote viewers) and aggregate across all inbound-rtp video layers
        const receiver: RTCRtpReceiver | undefined = track?.receiver;
        let usedReceiver = false;
        if (receiver && typeof (receiver as any).getStats === 'function') {
          try {
            const report = await (receiver as any).getStats();
            let totalBytes = 0;
            let widthMax = 0;
            let heightMax = 0;
            let fpsMax = 0;
            report.forEach((stat: any) => {
              if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                if (typeof stat.bytesReceived === 'number') totalBytes += stat.bytesReceived;
                if (typeof stat.frameWidth === 'number') widthMax = Math.max(widthMax, stat.frameWidth);
                if (typeof stat.frameHeight === 'number') heightMax = Math.max(heightMax, stat.frameHeight);
                if (typeof stat.framesPerSecond === 'number') fpsMax = Math.max(fpsMax, Math.round(stat.framesPerSecond));
              }
            });
            if (totalBytes > 0) {
              const prev = screenSharePrev.value.get(userId);
              const now = Date.now();
              if (prev) {
                const dtSec = Math.max(0.001, (now - prev.ts) / 1000);
                const delta = Math.max(0, totalBytes - prev.bytes);
                kbpsComputed = Math.round((delta * 8) / 1000 / dtSec);
              }
              screenSharePrev.value.set(userId, { bytes: totalBytes, ts: now });
              if (widthMax) width = widthMax;
              if (heightMax) height = heightMax;
              if (fpsMax) fps = fpsMax;
              usedReceiver = true;
            }
          } catch {}
        }
        // If no receiver stats (likely local sharer), aggregate sender stats across all outbound video layers
        if (!usedReceiver && kbpsComputed === undefined) {
          const sender: RTCRtpSender | undefined = (track?.sender)
            || (pub as any)?.sender
            || (pub as any)?.rtpSender
            || (pub as any)?._sender
            || (pub as any)?.trackSender;
          if (sender && typeof (sender as any).getStats === 'function') {
            try {
              const report = await (sender as any).getStats();
              let totalBytes: number | undefined;
              let usedField: 'bytesSent' | 'totalEncodedBytesTarget' | undefined;
              report.forEach((stat: any) => {
                if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
                  if (typeof stat.bytesSent === 'number') {
                    totalBytes = (totalBytes ?? 0) + stat.bytesSent;
                    usedField = 'bytesSent';
                  } else if (typeof stat.totalEncodedBytesTarget === 'number') {
                    totalBytes = (totalBytes ?? 0) + stat.totalEncodedBytesTarget;
                    if (!usedField) usedField = 'totalEncodedBytesTarget';
                  }
                  // Pull resolution/fps if available on outbound
                  if (typeof stat.frameWidth === 'number') width = Math.max(width ?? 0, stat.frameWidth);
                  if (typeof stat.frameHeight === 'number') height = Math.max(height ?? 0, stat.frameHeight);
                  if (typeof stat.framesPerSecond === 'number') fps = Math.max(fps ?? 0, Math.round(stat.framesPerSecond));
                }
              });
              if (typeof totalBytes === 'number') {
                const prev = screenSharePrev.value.get(userId);
                const now = Date.now();
                if (prev) {
                  const dtSec = Math.max(0.001, (now - prev.ts) / 1000);
                  const delta = Math.max(0, totalBytes - prev.bytes);
                  kbpsComputed = Math.round((delta * 8) / 1000 / dtSec);
                }
                screenSharePrev.value.set(userId, { bytes: totalBytes, ts: now });
              }
            } catch {}
          }
        }
        // Fallback to media track settings for local or if stats unavailable
        const mst: MediaStreamTrack | undefined = track?.mediaStreamTrack;
        const settings = mst?.getSettings?.() as MediaTrackSettings | undefined;
        if (!width && settings?.width) width = settings.width;
        if (!height && settings?.height) height = settings.height;
        if (!fps && typeof settings?.frameRate === 'number') fps = Math.round(settings.frameRate as number);
        const resolution = width && height ? `${width}×${height}` : '—';
        const cur = screenShareRuntime.value.get(userId) || {};
        let nextKbps = kbpsComputed ?? cur.kbps;
        if (typeof nextKbps === 'number' && nextKbps === 0 && typeof cur.kbps === 'number' && cur.kbps > 0) {
          // avoid flickering to 0.0 on brief pauses
          nextKbps = cur.kbps;
        }
        screenShareRuntime.value.set(userId, {
          ...cur,
          resolution,
          frameRate: fps ?? 0,
          hasAudio: !!(pubAudio && pubAudio.track),
          kbps: nextKbps
        });
      }
    } catch {}
  };
  // Start/stop timers based on modal open state
  if (props.isOpen) startIntervals();
  watch(() => props.isOpen, (open) => {
    if (open) startIntervals(); else stopIntervals();
  });
  onUnmounted(() => { stopIntervals(); });
});
</script>
