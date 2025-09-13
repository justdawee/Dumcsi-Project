import { computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useCameraSettings } from '@/composables/useCameraSettings';
import { useLocalCameraState } from '@/composables/useLocalCameraState';
import { livekitService } from '@/services/livekitService';
import { checkCameraPermission } from '@/utils/permissions';
import { Track, createLocalVideoTrack } from 'livekit-client';
import { useI18n } from 'vue-i18n';

export function useWebcamSharing() {
    const appStore = useAppStore();
    const authStore = useAuthStore();
    const { addToast } = useToast();
    const { selectedDeviceId, selectedQuality: selectedCamQuality, ensureDevicesLoaded } = useCameraSettings();
    const { isLocalCameraOn, isTogglingCamera, ensureCameraStateInitialized } = useLocalCameraState();
    const { t } = useI18n();

    const isCameraOn = computed(() => isLocalCameraOn.value);

    const toggleCamera = async () => {
        if (isTogglingCamera.value) return;
        isTogglingCamera.value = true;

        try {
            const localParticipant = livekitService.getLocalParticipant();
            if (!localParticipant) {
                throw new Error(t('voice.panel.errors.notConnected'));
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
                        message: permissionResult.error || t('voice.panel.errors.cameraPermissionRequired'),
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
                    throw new Error(t('voice.panel.errors.noVoiceChannel'));
                }
            } catch (e) {
                addToast({
                    message: t('voice.panel.errors.connectFailedCamera'),
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
                message: error?.message || t('voice.panel.errors.toggleCameraFailed'),
                type: 'danger'
            });
        } finally {
            isTogglingCamera.value = false;
        }
    };

    const enableCamera = async (localParticipant: any) => {
        // Step 1: Thoroughly clean up any existing camera track BEFORE creating a new one
        const existingPub: any = localParticipant.getTrackPublication(Track.Source.Camera);

        if (existingPub) {
            console.log('Found existing camera publication, cleaning up...');

            // CRITICAL: Get the track SID for complete cleanup
            const trackSid = existingPub.trackSid;
            console.log('Existing track SID:', trackSid);

            // First unpublish the track to notify all remote participants
            if (existingPub.track) {
                try {
                    // Use stopPublish=true to ensure the track is fully stopped
                    await localParticipant.unpublishTrack(existingPub.track, true);
                    console.log('Successfully unpublished existing camera track');
                } catch (unpubError) {
                    console.warn('Error unpublishing camera track:', unpubError);
                }
            }

            // Stop the MediaStreamTrack directly to release the camera hardware
            if (existingPub.track?.mediaStreamTrack) {
                try {
                    existingPub.track.mediaStreamTrack.stop();
                    console.log('MediaStreamTrack stopped');
                } catch (stopError) {
                    console.warn('Error stopping MediaStreamTrack:', stopError);
                }
            }

            // Destroy the track object completely to prevent reuse
            if (existingPub.track && typeof existingPub.track.stop === 'function') {
                try {
                    existingPub.track.stop();
                    console.log('LiveKit track stopped');
                } catch (stopError) {
                    console.warn('Error stopping LiveKit track:', stopError);
                }
            }

            // Also try to disable camera through the standard API to ensure clean state
            try {
                await localParticipant.setCameraEnabled(false);
                console.log('Camera disabled via API');
            } catch (disableError) {
                console.warn('Error disabling camera via API:', disableError);
            }

            // IMPORTANT: Wait for the unpublish to fully propagate to all participants
            // This prevents the "skipping incoming track as it already ended" error
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Step 2: Create and publish a completely new track with unique identifier
        try {
            const deviceId = selectedDeviceId.value || undefined;

            // Create a fresh video track with specific constraints
            const videoTrack = await createLocalVideoTrack({
                deviceId: deviceId as any,
                resolution: {
                    width: selectedCamQuality.value.width,
                    height: selectedCamQuality.value.height
                } as any,
                // Add additional constraints to ensure a fresh track
                facingMode: deviceId ? undefined : 'user'
            } as any);

            // IMPORTANT: Use a timestamp-based unique name to ensure LiveKit treats this as a completely new track
            const trackName = `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Publish the new track with explicit options
            await localParticipant.publishTrack(videoTrack, {
                source: Track.Source.Camera,
                name: trackName,
                // Force simulcast for better quality adaptation
                simulcast: true,
                // Ensure track is treated as new
                stopMicTrackOnMute: false
            } as any);

            console.log('New camera track published successfully with name:', trackName);

            // Small delay to ensure the track is fully registered
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (trackError: any) {
            console.error('Failed to create/publish new camera track:', trackError);

            // Fallback: Try using the LiveKit high-level API
            try {
                console.log('Attempting fallback with setCameraEnabled API...');

                // Wait a bit before retry
                await new Promise(resolve => setTimeout(resolve, 500));

                const deviceId = selectedDeviceId.value || undefined;
                const w = selectedCamQuality.value.width;
                const h = selectedCamQuality.value.height;

                await localParticipant.setCameraEnabled(true, {
                    deviceId: deviceId as any,
                    resolution: (w && h) ? { width: w, height: h } as any : undefined,
                } as any);

                console.log('Camera enabled via LiveKit API fallback');
            } catch (apiError: any) {
                const msg = apiError?.message || String(apiError);
                throw new Error(`Failed to enable camera: ${msg}`);
            }
        }
    };

    const disableCamera = async (localParticipant: any) => {
        try {
            console.log('Disabling camera...');

            // Step 1: Get the existing track publication
            const existingPub: any = localParticipant.getTrackPublication(Track.Source.Camera);

            // Step 2: First unpublish the track to notify remote participants immediately
            if (existingPub?.track) {
                try {
                    // IMPORTANT: Unpublish BEFORE disabling to ensure proper cleanup order
                    await localParticipant.unpublishTrack(existingPub.track, true);
                    console.log('Camera track unpublished');
                } catch (unpubError) {
                    console.warn('Error unpublishing camera track:', unpubError);
                }

                // Stop the MediaStreamTrack to release camera hardware
                const mediaTrack = existingPub.track?.mediaStreamTrack;
                if (mediaTrack && mediaTrack.stop) {
                    try {
                        mediaTrack.stop();
                        console.log('MediaStreamTrack stopped');
                    } catch (stopError) {
                        console.warn('Error stopping MediaStreamTrack:', stopError);
                    }
                }
            }

            // Step 3: Disable via LiveKit API to update internal state
            try {
                await localParticipant.setCameraEnabled(false);
                console.log('Camera disabled via API');
            } catch (apiError) {
                console.warn('Error disabling camera via API:', apiError);
            }

            // Step 4: Wait to ensure all participants process the track removal
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (disableError) {
            console.error('Error disabling camera:', disableError);
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
                    console.log('Camera track restarted with new constraints');
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
                    console.log('Camera track replaced');
                } else {
                    // Last resort: full disable/enable cycle
                    console.log('Performing full camera restart for hot switch...');
                    await disableCamera(localParticipant);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await enableCamera(localParticipant);
                }
                isLocalCameraOn.value = true;
            }
        } catch (error) {
            console.error('Hot switch camera failed:', error);
            // If hot switch fails, try a full restart
            try {
                await disableCamera(localParticipant);
                await new Promise(resolve => setTimeout(resolve, 500));
                await enableCamera(localParticipant);
            } catch (restartError) {
                console.error('Camera restart failed:', restartError);
            }
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
