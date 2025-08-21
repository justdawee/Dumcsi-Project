import { ref } from 'vue';
import { livekitService } from '@/services/livekitService';
import { Track, createLocalVideoTrack } from 'livekit-client';

const isLocalCameraOn = ref(false);
const isTogglingCamera = ref(false);
let listenersInitialized = false;

function attachLocalParticipantListeners() {
  const lp = livekitService.getLocalParticipant();
  if (!lp) return;

  // Initial sync
  try { isLocalCameraOn.value = lp.isCameraEnabled; } catch {}

  // Avoid double registration by clearing existing handlers not available; rely on idempotent event add
  lp.on('trackPublished', (publication: any) => {
    try {
      if (publication?.kind === 'video' && publication?.source === Track.Source.Camera) {
        isLocalCameraOn.value = true;
      }
    } catch {}
  });
  lp.on('trackUnpublished', (publication: any) => {
    try {
      if (publication?.kind === 'video' && publication?.source === Track.Source.Camera) {
        isLocalCameraOn.value = false;
      }
    } catch {}
  });
}

export function useLocalCameraState() {
  function ensureCameraStateInitialized() {
    if (listenersInitialized) return;
    listenersInitialized = true;

    // Try immediately
    attachLocalParticipantListeners();

    // Best-effort delayed attempts in case connection happens later
    setTimeout(() => attachLocalParticipantListeners(), 300);
    setTimeout(() => attachLocalParticipantListeners(), 1000);
  }

  async function hotSwitchCamera(deviceId?: string | null, width?: number, height?: number) {
    const lp = livekitService.getLocalParticipant();
    if (!lp) return;
    try {
      const pub: any = lp.getTrackPublication(Track.Source.Camera);
      const currentTrack: any = pub?.track;
      const hasRestart = typeof currentTrack?.restartTrack === 'function';
      const targetDeviceId: any = deviceId || undefined;
      const w = width; const h = height;
      if (pub && currentTrack) {
        if (hasRestart) {
          // Preferred: restart existing track with new constraints
          await currentTrack.restartTrack({ deviceId: targetDeviceId, resolution: (w && h) ? { width: w, height: h } as any : undefined } as any);
        } else if (typeof pub.replaceTrack === 'function') {
          // Fallback: replace with a newly created track
          const newTrack = await createLocalVideoTrack({ deviceId: targetDeviceId, resolution: (w && h) ? { width: w, height: h } as any : undefined } as any);
          await pub.replaceTrack(newTrack);
          try { currentTrack.stop?.(); } catch {}
        } else {
          // Last resort: unpublish/publish
          try { await lp.unpublishTrack(currentTrack, true); } catch {}
          const newTrack = await createLocalVideoTrack({ deviceId: targetDeviceId, resolution: (w && h) ? { width: w, height: h } as any : undefined } as any);
          await lp.publishTrack(newTrack, { source: Track.Source.Camera, name: 'camera' } as any);
        }
        isLocalCameraOn.value = true;
      }
    } catch {
      // ignore
    }
  }

  return {
    isLocalCameraOn,
    isTogglingCamera,
    ensureCameraStateInitialized,
    hotSwitchCamera,
  };
}
