<template>
  <div v-if="screenShares.length > 0" class="screen-share-viewer">
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-200">Screen Shares</h3>
    </div>
    
    <div class="grid gap-4" :class="gridClass">
      <div 
        v-for="share in screenShares" 
        :key="share.participant.identity"
        class="relative bg-gray-800 rounded-lg overflow-hidden"
      >
        <video
          :ref="el => setVideoRef(el, share.participant.identity)"
          autoplay
          playsinline
          muted
          class="w-full h-auto max-h-96 object-contain"
        />
        
        <div class="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
          {{ share.participant.name || share.participant.identity }}
        </div>
        
        <!-- Fullscreen toggle -->
        <button
          @click="toggleFullscreen(share.participant.identity)"
          class="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded hover:bg-opacity-90 transition-colors"
          title="Toggle fullscreen"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { livekitService } from '@/services/livekitService';
import type { RemoteParticipant, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import { Track } from 'livekit-client';

interface ScreenShare {
  participant: RemoteParticipant;
  videoTrack: RemoteTrack;
}

const screenShares = ref<ScreenShare[]>([]);
const videoRefs = ref<Map<string, HTMLVideoElement>>(new Map());

const gridClass = computed(() => {
  const count = screenShares.value.length;
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 lg:grid-cols-2';
  if (count <= 4) return 'grid-cols-1 lg:grid-cols-2';
  return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
});

const setVideoRef = (el: any, participantId: string) => {
  if (el) {
    videoRefs.value.set(participantId, el as HTMLVideoElement);
  } else {
    videoRefs.value.delete(participantId);
  }
};

const updateScreenShares = () => {
  const participants = livekitService.getRemoteParticipants();
  const newScreenShares: ScreenShare[] = [];

  participants.forEach(participant => {
    participant.trackPublications.forEach(publication => {
      if (publication.source === Track.Source.ScreenShare && 
          publication.isSubscribed && 
          publication.track?.kind === 'video') {
        newScreenShares.push({
          participant,
          videoTrack: publication.track
        });
      }
    });
  });

  screenShares.value = newScreenShares;
  
  // Update video elements with better error handling
  setTimeout(() => {
    newScreenShares.forEach(share => {
      const videoElement = videoRefs.value.get(share.participant.identity);
      if (videoElement && share.videoTrack) {
        try {
          // Detach any existing track first
          if (videoElement.srcObject) {
            share.videoTrack.detach(videoElement);
          }
          // Attach the new track
          share.videoTrack.attach(videoElement);
        } catch (error) {
          console.error('Failed to attach screen share track:', error);
        }
      }
    });
  }, 100);
};

const onTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
  if (publication.source === Track.Source.ScreenShare && track.kind === 'video') {
    
    updateScreenShares();
  }
};

const onTrackUnsubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
  if (publication.source === Track.Source.ScreenShare && track.kind === 'video') {
    
    
    // Detach track from video element before updating
    const videoElement = videoRefs.value.get(participant.identity);
    if (videoElement) {
      track.detach(videoElement);
    }
    
    updateScreenShares();
  }
};

const onParticipantDisconnected = (participant: RemoteParticipant) => {
  
  videoRefs.value.delete(participant.identity);
  updateScreenShares();
};

const toggleFullscreen = (participantId: string) => {
  const videoElement = videoRefs.value.get(participantId);
  if (!videoElement) return;

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(console.error);
  } else {
    videoElement.requestFullscreen().catch(console.error);
  }
};

onMounted(() => {
  // Set up LiveKit event listeners
  livekitService.onTrackSubscribed(onTrackSubscribed);
  livekitService.onTrackUnsubscribed(onTrackUnsubscribed);
  livekitService.onParticipantDisconnected(onParticipantDisconnected);
  
  // Initial update
  updateScreenShares();
});

onUnmounted(() => {
  // Clean up video refs
  videoRefs.value.clear();
});
</script>

<style scoped>
@reference "@/style.css";

.screen-share-viewer {
  @apply p-4 bg-gray-900 rounded-lg;
}
</style>
