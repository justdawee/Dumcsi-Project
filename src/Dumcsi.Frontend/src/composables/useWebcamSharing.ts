import { computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useCameraSettings } from '@/composables/useCameraSettings';
import { useLocalCameraState } from '@/composables/useLocalCameraState';
import { livekitService } from '@/services/livekitService';
import { checkCameraPermission } from '@/utils/permissions';
import { Track, createLocalVideoTrack } from 'livekit-client';

export function useWebcamSharing() {
  const appStore = useAppStore();
  const authStore = useAuthStore();
  const { addToast } = useToast();
  const { selectedDeviceId, selectedQuality: selectedCamQuality, ensureDevicesLoaded } = useCameraSettings();
  const { isLocalCameraOn, isTogglingCamera, ensureCameraStateInitialized } = useLocalCameraState();
  
  const isCameraOn = computed(() => isLocalCameraOn.value);

  const toggleCamera = async () => {
    if (isTogglingCamera.value) return;
    isTogglingCamera.value = true;
    
    try {
      const localParticipant = livekitService.getLocalParticipant();
      if (!localParticipant) {
        throw new Error('Not connected to voice channel');
      }

      const isEnabled = localParticipant.isCameraEnabled;

      // If trying to enable camera, check permissions first
      if (!isEnabled) {
        // Ensure device list is loaded to provide stable capture options
        try { 
          await ensureDevicesLoaded(); 
        } catch { 
          // ignore device enumeration errors 
        }
        
        // Check camera permission before enabling
        const permissionResult = await checkCameraPermission();
        
        if (!permissionResult.granted) {
          // Show permission error message
          addToast({
            message: permissionResult.error || 'Camera access is required to enable video',
            type: 'danger',
            duration: 5000
          });
          return;
        }
      }
      
      // Ensure LiveKit connection (best effort)
      try {
        const identity = String(appStore.currentUserId ?? (authStore.user?.username ?? `user_${Date.now()}`));
        if (appStore.currentVoiceChannelId) {
          await livekitService.ensureConnected(appStore.currentVoiceChannelId, identity);
        } else {
          throw new Error('No voice channel');
        }
      } catch (e) {
        addToast({ 
          message: 'Failed to connect to voice channel for camera', 
          type: 'danger' 
        });
        return;
      }

      if (!isEnabled) {
        // Enable camera with proper cleanup of existing tracks
        await enableCamera(localParticipant);
        try { 
          isLocalCameraOn.value = true; 
        } catch {}
      } else {
        // Disable camera with proper cleanup
        await disableCamera(localParticipant);
        try { 
          isLocalCameraOn.value = false; 
        } catch {}
      }
    } catch (error: any) {
      console.error('Webcam sharing error:', error);
      addToast({ 
        message: error?.message || 'Failed to toggle camera', 
        type: 'danger' 
      });
    } finally {
      isTogglingCamera.value = false;
    }
  };

  const enableCamera = async (localParticipant: any) => {
    // Step 1: Clean up any existing camera track thoroughly
    const existingPub: any = localParticipant.getTrackPublication(Track.Source.Camera);
    if (existingPub?.track) {
      try {
        // First unpublish from LiveKit to notify remote participants
        await localParticipant.unpublishTrack(existingPub.track, true);
        
        // Then stop the MediaStreamTrack to fully release the camera
        const mediaTrack = (existingPub.track as any)?.mediaStreamTrack;
        if (mediaTrack && mediaTrack.stop) {
          mediaTrack.stop();
        }
        
        // Wait longer for the unpublish to propagate to all participants
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (cleanupError) {
        console.warn('Failed to cleanup existing camera track:', cleanupError);
        // Continue anyway - might be stale reference
      }
    }

    // Step 2: Additional wait to ensure all participants have processed the unpublish
    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 3: Always use explicit track creation for better reliability
    // This ensures we get a completely fresh track instead of potentially reusing ended ones
    try {
      const deviceId = selectedDeviceId.value || undefined;
      const videoTrack = await createLocalVideoTrack({
        deviceId: deviceId as any,
        resolution: { 
          width: selectedCamQuality.value.width, 
          height: selectedCamQuality.value.height 
        } as any
      } as any);
      
      // Publish with a unique name to help LiveKit distinguish this from previous tracks
      const trackName = `camera_${Date.now()}`;
      await localParticipant.publishTrack(videoTrack, { 
        source: Track.Source.Camera, 
        name: trackName
      } as any);
      
      console.log('Camera track published successfully with name:', trackName);
    } catch (trackError: any) {
      // Fallback to LiveKit API if explicit track creation fails
      console.warn('Explicit track creation failed, trying LiveKit API:', trackError?.message || trackError);
      try {
        const deviceId = selectedDeviceId.value || undefined;
        const w = selectedCamQuality.value.width;
        const h = selectedCamQuality.value.height;
        
        await localParticipant.setCameraEnabled(true, {
          deviceId: deviceId as any,
          resolution: (w && h) ? { width: w, height: h } as any : undefined,
        } as any);
        
        console.log('Camera enabled via LiveKit API');
      } catch (apiError: any) {
        const msg = trackError?.message || String(trackError);
        throw new Error(`Failed to enable camera${msg ? `: ${msg}` : ''}`);
      }
    }
  };

  const disableCamera = async (localParticipant: any) => {
    try {
      // Step 1: Get the existing track before disabling
      const existingPub: any = localParticipant.getTrackPublication(Track.Source.Camera);
      
      // Step 2: Disable via LiveKit API first to signal intent
      await localParticipant.setCameraEnabled(false);
      
      // Step 3: Ensure thorough cleanup of the track
      if (existingPub?.track) {
        // Explicitly unpublish to ensure remote participants are notified
        try {
          await localParticipant.unpublishTrack(existingPub.track, true);
        } catch (unpubError) {
          console.warn('Error unpublishing camera track:', unpubError);
        }
        
        // Stop the MediaStreamTrack to fully release the camera
        const mediaTrack = (existingPub.track as any)?.mediaStreamTrack;
        if (mediaTrack && mediaTrack.stop) {
          mediaTrack.stop();
        }
      }
      
      // Step 4: Wait to ensure all participants process the track removal
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (disableError) {
      console.warn('Error disabling camera:', disableError);
      throw disableError;
    }
  };

  // Hot-switch camera while it's on (change device or quality without turning off/on)
  const hotSwitchCamera = async (deviceId?: string | null, width?: number, height?: number) => {
    if (!isLocalCameraOn.value) return;
    
    const localParticipant = livekitService.getLocalParticipant();
    if (!localParticipant) return;
    
    try {
      const pub: any = localParticipant.getTrackPublication(Track.Source.Camera);
      const currentTrack: any = pub?.track;
      const hasRestart = typeof currentTrack?.restartTrack === 'function';
      const targetDeviceId: any = deviceId || undefined;
      const w = width; 
      const h = height;
      
      if (pub && currentTrack) {
        if (hasRestart) {
          // Preferred: restart existing track with new constraints
          await currentTrack.restartTrack({ 
            deviceId: targetDeviceId, 
            resolution: (w && h) ? { width: w, height: h } as any : undefined 
          } as any);
        } else if (typeof pub.replaceTrack === 'function') {
          // Fallback: replace with a newly created track
          const newTrack = await createLocalVideoTrack({ 
            deviceId: targetDeviceId, 
            resolution: (w && h) ? { width: w, height: h } as any : undefined 
          } as any);
          await pub.replaceTrack(newTrack);
          try { 
            currentTrack.stop?.(); 
          } catch {}
        } else {
          // Last resort: unpublish/publish
          try { 
            await localParticipant.unpublishTrack(currentTrack, true); 
          } catch {}
          const newTrack = await createLocalVideoTrack({ 
            deviceId: targetDeviceId, 
            resolution: (w && h) ? { width: w, height: h } as any : undefined 
          } as any);
          await localParticipant.publishTrack(newTrack, { 
            source: Track.Source.Camera, 
            name: 'camera' 
          } as any);
        }
        isLocalCameraOn.value = true;
      }
    } catch (error) {
      console.warn('Hot switch camera failed:', error);
    }
  };

  // Initialize camera state if needed
  const initializeCameraState = () => {
    ensureCameraStateInitialized();
  };

  return {
    isCameraOn,
    isTogglingCamera,
    toggleCamera,
    hotSwitchCamera,
    initializeCameraState,
  };
}