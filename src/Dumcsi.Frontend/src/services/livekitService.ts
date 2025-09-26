import { 
    Room, 
    RoomEvent, 
    RemoteParticipant, 
    LocalParticipant, 
    Track,
    LocalTrackPublication,
    RemoteTrackPublication,
    RemoteTrack,
    ConnectionState,
    createLocalScreenTracks
} from 'livekit-client';
import type { ScreenShareCaptureOptions } from 'livekit-client';
import api from './api';
import type { EntityId } from './types';

export interface LiveKitTokenRequest {
    RoomName: string;
    ParticipantName: string;
    Role?: number; // 0=Subscriber, 1=Publisher, 2=Admin
    TokenExpirationMinutes?: number;
}

export interface LiveKitServerInfo {
    url: string;
    version: string;
}

export interface ScreenShareQualitySettings {
    width: number;
    height: number;
    frameRate?: number;
    includeAudio: boolean;
}

export class LiveKitService {
    private room: Room | null = null;
    private isConnected = false;
    private isConnecting = false;
    private connectSeq = 0; // monotonically increasing attempt id
    private connectPromise: Promise<void> | null = null;
    private screenShareTrack: LocalTrackPublication | null = null;
    private currentChannelId: EntityId | null = null;
    private currentIdentity: string | null = null;
    private userInitiatedDisconnect = false;
    private onParticipantConnectedCallbacks: ((participant: RemoteParticipant) => void)[] = [];
    private onParticipantDisconnectedCallbacks: ((participant: RemoteParticipant) => void)[] = [];
    private onTrackSubscribedCallbacks: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void)[] = [];
    private onTrackUnsubscribedCallbacks: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void)[] = [];
    private onTrackMutedCallbacks: ((publication: RemoteTrackPublication, participant: RemoteParticipant) => void)[] = [];
    private onTrackUnmutedCallbacks: ((publication: RemoteTrackPublication, participant: RemoteParticipant) => void)[] = [];
    private onLocalScreenShareStoppedCallbacks: Array<() => void> = [];

    async getServerInfo(): Promise<LiveKitServerInfo> {
        // Use explicit env when provided, otherwise derive from current origin and
        // proxy through Nginx at /livekit to avoid hardcoding IPs/ports.
        const envUrl = import.meta.env.VITE_LIVEKIT_URL as string | undefined;

        let url = envUrl && envUrl.trim().length > 0 ? envUrl : '';
        if (!url && typeof window !== 'undefined') {
            const isHttps = window.location.protocol === 'https:';
            const wsScheme = isHttps ? 'wss' : 'ws';
            url = `${wsScheme}://${window.location.host}/livekit`;
        }

        return {
            url,
            version: '1.0.0'
        };
    }

    async getAccessToken(roomName: string, participantName: string): Promise<string> {
        const request: LiveKitTokenRequest = {
            RoomName: roomName,
            ParticipantName: participantName,
            Role: 1, // Publisher role to allow screen sharing
            TokenExpirationMinutes: 360
        };

        const response = await api.post('/LiveKit/token', request);
        return response.data.data.token; // Extract token from ApiResponse wrapper
    }

    async connectToRoom(channelId: EntityId, participantName?: string): Promise<void> {
        const effectiveParticipantName = participantName || `user_${Date.now()}`;

        // Idempotent: if already connected to the same channel with the same identity, do nothing
        if (this.isRoomConnected() && this.currentChannelId === channelId && this.currentIdentity === String(effectiveParticipantName)) {
            return;
        }

        // If a connect is in-flight to the same target, return the same promise
        if (this.isConnecting && this.currentChannelId === channelId && this.currentIdentity === String(effectiveParticipantName) && this.connectPromise) {
            return this.connectPromise;
        }

        const attemptId = ++this.connectSeq;
        this.isConnecting = true;
        this.currentChannelId = channelId;
        this.currentIdentity = String(effectiveParticipantName);

        // Create a new attempt promise and store it so concurrent callers share it
        const attempt = (async () => {
            try {
                // If we have an existing room (connected or connecting), disconnect without spamming errors
                if (this.room) {
                    this.userInitiatedDisconnect = true;
                    try { await this.room.disconnect(); } catch { /* ignore */ }
                    this.room = null;
                    this.isConnected = false;
                    this.userInitiatedDisconnect = false;
                }

                const serverInfo = await this.getServerInfo();
                const roomName = `channel_${channelId}`;
                const token = await this.getAccessToken(roomName, effectiveParticipantName);

                // Create a fresh room
                const room = new Room({ adaptiveStream: true, dynacast: true });
                this.room = room;
                this.setupRoomEventListeners();

                // Connect with enhanced WebRTC configuration
                await room.connect(serverInfo.url, token, {
                    rtcConfig: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun.cloudflare.com:3478' },
                        ],
                        iceCandidatePoolSize: 10,
                    },
                    autoSubscribe: true,
                });

                // If another attempt started meanwhile, gracefully disconnect this one
                if (attemptId !== this.connectSeq) {
                    try { await room.disconnect(); } catch { /* ignore */ }
                    return; // don't mark connected
                }

                this.isConnected = true;
            } catch (error: any) {
                // Treat client-initiated disconnects during reconnects as benign
                const msg = (error && (error.message || String(error))) || '';
                const isClientAbort = typeof msg === 'string' && msg.toLowerCase().includes('client initiated disconnect');
                if (isClientAbort || this.userInitiatedDisconnect) {
                    // Downgrade to info to avoid noisy console
                    console.info('LiveKit: connection attempt aborted by client (expected during reconnect).');
                    return;
                }

                // Provide context but avoid overly noisy logs
                console.warn('LiveKit: failed to connect:', error?.message || error);
                throw error;
            } finally {
                // Only clear connecting state if this is the last attempt
                if (attemptId === this.connectSeq) {
                    this.isConnecting = false;
                    this.connectPromise = null;
                }
            }
        })();

        this.connectPromise = attempt;
        return attempt;
    }

    async disconnectFromRoom(): Promise<void> {
        if (!this.room) return;
        try {
            if (this.screenShareTrack) {
                await this.stopScreenShare();
            }
            
            // Clean up all local tracks before disconnecting
            const localParticipant = this.room.localParticipant;
            if (localParticipant) {
                // Stop all local tracks
                localParticipant.trackPublications.forEach(pub => {
                    if (pub.track && pub.track.source) {
                        try {
                            const mediaTrack = (pub.track as any)?.mediaStreamTrack;
                            if (mediaTrack && mediaTrack.stop) {
                                mediaTrack.stop();
                            }
                        } catch (error) {
                            console.warn('Failed to stop local track:', error);
                        }
                    }
                });
            }
        } catch { /* ignore */ }
        try {
            this.userInitiatedDisconnect = true;
            await this.room.disconnect();
        } catch { /* ignore */ }
        finally {
            this.userInitiatedDisconnect = false;
            this.room = null;
            this.isConnected = false;
            this.isConnecting = false;
            this.connectPromise = null;
        }
    }

    async startScreenShare(qualitySettings?: ScreenShareQualitySettings): Promise<void> {
        if (!this.room || !this.isConnected) {
            throw new Error('Not connected to room');
        }

        if (this.isScreenSharing()) {
            // already active
            return;
        }

        try {
            if (qualitySettings) {
                // Use advanced screen sharing with quality settings and audio
                const captureOptions: ScreenShareCaptureOptions = {
                    audio: qualitySettings.includeAudio,
                    video: true,
                    // Enable system audio capture if requested
                    systemAudio: qualitySettings.includeAudio ? 'include' : 'exclude',
                    // Suppress local audio playback to avoid echo
                    suppressLocalAudioPlayback: qualitySettings.includeAudio,
                    // Allow current tab selection for better UX
                    selfBrowserSurface: 'include',
                    // Enable surface switching for dynamic capture changes
                    surfaceSwitching: 'include'
                };

                // Create screen tracks with custom options
                const tracks = await createLocalScreenTracks(captureOptions);
                
                // Publish the tracks with quality constraints
                for (const track of tracks) {
                    const publishOptions: any = {
                        name: track.source === Track.Source.ScreenShare ? 'screen' : 'screen-audio',
                        source: track.source
                    };

                    // Apply video constraints for screen share tracks
                    if (track.source === Track.Source.ScreenShare && track.kind === 'video') {
                        // Apply resolution constraints via video encoding
                        publishOptions.videoEncoding = {
                            maxBitrate: this.getBitrateForResolution(qualitySettings.width, qualitySettings.height, qualitySettings.frameRate),
                            maxFramerate: qualitySettings.frameRate
                        };

                        // Try to apply constraints directly to the video track
                        const videoTrack = track.mediaStreamTrack;
                        if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
                            try {
                                await videoTrack.applyConstraints({
                                    width: { ideal: qualitySettings.width },
                                    height: { ideal: qualitySettings.height },
                                    frameRate: { ideal: qualitySettings.frameRate }
                                });
                            } catch (_constraintError) { /* ignore */ }
                        }
                    }

                    await this.room.localParticipant.publishTrack(track, publishOptions);
                }
            } else {
                // Use the simplified LiveKit API for basic screen sharing and include audio by default
                await this.room.localParticipant.setScreenShareEnabled(true, { audio: true as any });
            }
            
            // Update our tracking
            this.updateScreenShareTrack();
            // Attach 'ended' listeners to detect user stopping from browser UI
            const localPub = this.room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
            const localTrack = localPub?.track as any;
            const mediaTrack: MediaStreamTrack | undefined = localTrack?.mediaStreamTrack;
            if (mediaTrack) {
                const onEnded = () => {
                    // Local screen share track ended
                    this.screenShareTrack = null;
                    this.triggerLocalScreenShareStopped();
                };
                try {
                    mediaTrack.addEventListener('ended', onEnded, { once: true } as any);
                } catch (_e) {
                    // ignore bind errors
                }
            }
            
        } catch (error) {
            console.error('Failed to start screen share:', error);
            
            // Provide more specific error messages
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    throw new Error('Screen sharing permission denied by user');
                } else if (error.name === 'NotFoundError') {
                    throw new Error('No screen available for sharing');
                } else if (error.name === 'AbortError') {
                    throw new Error('Screen sharing cancelled by user');
                } else if (error.name === 'NotSupportedError') {
                    throw new Error('Screen sharing not supported in this browser');
                } else if (error.name === 'NotReadableError') {
                    throw new Error('Screen capture failed - screen may be in use by another application');
                }
            }
            throw error;
        }
    }

    async stopScreenShare(): Promise<void> {
        if (!this.room) {
            return;
        }

        try {
            // Use the simplified LiveKit API
            await this.room.localParticipant.setScreenShareEnabled(false);
            
            // Update our tracking
            this.screenShareTrack = null;
        } catch (error) {
            console.error('Failed to stop screen share:', error);
            throw error;
        }
    }

    isScreenSharing(): boolean {
        if (!this.room) return false;
        
        // Check if local participant has an active screen share track
        const localParticipant = this.room.localParticipant;
        const screenSharePublication = localParticipant.getTrackPublication(Track.Source.ScreenShare);
        
        return screenSharePublication !== undefined && screenSharePublication.track !== undefined;
    }

    private updateScreenShareTrack(): void {
        if (!this.room) return;
        
        const localParticipant = this.room.localParticipant;
        const screenSharePublication = localParticipant.getTrackPublication(Track.Source.ScreenShare);
        
        this.screenShareTrack = screenSharePublication || null;
    }

    private getBitrateForResolution(width: number, height: number, frameRate: number = 30): number {
        // Calculate appropriate bitrate based on resolution and frame rate
        // Formula: pixels * frame_rate * bits_per_pixel
        const pixels = width * height;
        const bitsPerPixel = 0.08; // Conservative estimate for screen content (less than video content)
        
        // Base calculation
        let bitrate = pixels * frameRate * bitsPerPixel;
        
        // Apply quality-based adjustments based on resolution and frame rate
        const maxBitrates = {
            '4k': frameRate >= 60 ? 12_000_000 : frameRate >= 30 ? 8_000_000 : 6_000_000,
            '1080p': frameRate >= 60 ? 6_000_000 : frameRate >= 30 ? 4_000_000 : 2_500_000,
            '720p': frameRate >= 60 ? 3_000_000 : frameRate >= 30 ? 2_000_000 : 1_200_000,
            '480p': frameRate >= 60 ? 1_500_000 : frameRate >= 30 ? 1_000_000 : 600_000
        };

        let maxBitrate: number;
        if (pixels >= 3840 * 2160) { // 4K
            maxBitrate = maxBitrates['4k'];
        } else if (pixels >= 1920 * 1080) { // 1080p
            maxBitrate = maxBitrates['1080p'];
        } else if (pixels >= 1280 * 720) { // 720p
            maxBitrate = maxBitrates['720p'];
        } else { // 480p and below
            maxBitrate = maxBitrates['480p'];
        }

        bitrate = Math.min(bitrate, maxBitrate);
        
        // Ensure minimum bitrate (scale with frame rate)
        const minBitrate = Math.max(200_000, frameRate * 8_000); // Minimum 200 Kbps or 8 Kbps per FPS
        return Math.max(bitrate, minBitrate);
    }

    getRoom(): Room | null {
        return this.room;
    }

    isRoomConnected(): boolean {
        return this.room !== null && this.room.state === 'connected' && this.isConnected;
    }

    getRemoteParticipants(): RemoteParticipant[] {
        if (!this.room) return [];
        const participants = Array.from(this.room.remoteParticipants.values());
        return participants;
    }

    async ensureConnected(channelId: EntityId, participantName?: string): Promise<void> {
        if (
            this.isRoomConnected() &&
            this.currentChannelId === channelId &&
            this.currentIdentity === String(participantName || '')
        ) {
            return;
        }
        return this.connectToRoom(channelId, participantName);
    }

    getLocalParticipant(): LocalParticipant | null {
        return this.room?.localParticipant || null;
    }

    getTotalParticipantCount(): number {
        if (!this.room || !this.isRoomConnected()) {
            return 0;
        }
        
        // Count remote participants + local participant
        return this.room.remoteParticipants.size + 1;
    }

    private triggerTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
        this.onTrackUnsubscribedCallbacks.forEach(callback => {
            try {
                callback(track, publication, participant);
            } catch (error) {
                console.error('Error in track unsubscribed callback:', error);
            }
        });
    }

    private triggerTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
        this.onTrackSubscribedCallbacks.forEach(callback => {
            try {
                callback(track, publication, participant);
            } catch (error) {
                console.error('Error in track subscribed callback:', error);
            }
        });
    }

    async refreshParticipantTracks(): Promise<void> {
        if (!this.room) return;

        console.log('Forcing LiveKit participant track refresh...');

        // Get all remote participants
        const participants = Array.from(this.room.remoteParticipants.values());

        for (const participant of participants) {
            // Force re-subscription to all tracks
            const publications = Array.from(participant.trackPublications.values());

            for (const publication of publications) {
                if (publication.isSubscribed && publication.track) {
                    try {
                        // Try to force track refresh by unsubscribing and resubscribing
                        console.log(`Refreshing track for participant ${participant.identity}, source: ${publication.source}`);

                        // Note: This is a workaround - ideally LiveKit would handle this internally
                        // We're triggering the unsubscribed callbacks to force cleanup
                        this.triggerTrackUnsubscribed(
                            publication.track as RemoteTrack,
                            publication as RemoteTrackPublication,
                            participant
                        );

                        // Small delay before re-triggering subscribed
                        setTimeout(() => {
                            if (publication.track && publication.isSubscribed) {
                                this.triggerTrackSubscribed(
                                    publication.track as RemoteTrack,
                                    publication as RemoteTrackPublication,
                                    participant
                                );
                            }
                        }, 100);
                    } catch (error) {
                        console.warn('Failed to refresh track:', error);
                    }
                }
            }
        }
    }

    private setupRoomEventListeners(): void {
        if (!this.room) return;

        this.room.on(RoomEvent.Connected, () => {
            this.isConnected = true;
        });

        this.room.on(RoomEvent.Disconnected, (_reason) => {
            this.isConnected = false;
        });

        this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            this.onParticipantConnectedCallbacks.forEach(callback => callback(participant));
        });

        this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            this.onParticipantDisconnectedCallbacks.forEach(callback => callback(participant));
        });

        this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            this.onTrackSubscribedCallbacks.forEach(callback => callback(track, publication, participant));
        });

        this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            this.onTrackUnsubscribedCallbacks.forEach(callback => callback(track, publication, participant));
        });

        // Track muted/unmuted events (covers local and remote)
        this.room.on(RoomEvent.TrackMuted as any, (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            this.onTrackMutedCallbacks.forEach(cb => cb(publication, participant));
        });
        this.room.on(RoomEvent.TrackUnmuted as any, (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            this.onTrackUnmutedCallbacks.forEach(cb => cb(publication, participant));
        });

        this.room.on(RoomEvent.ConnectionStateChanged, (_state: ConnectionState) => {
        });

        // Detect when local screen share is unpublished (e.g., user stops from browser UI)
        this.room.on(RoomEvent.LocalTrackUnpublished as any, (_pub: any, _participant: LocalParticipant) => {
            try {
                // If the unpublished track was the screen share, trigger callbacks
                const hasScreen = this.isScreenSharing();
                if (!hasScreen) {
                    this.screenShareTrack = null;
                    this.triggerLocalScreenShareStopped();
                }
            } catch (_e) { /* ignore */ }
        });
    }

    // Event listener registration methods (now supports multiple callbacks)
    onParticipantConnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantConnectedCallbacks.push(callback);
    }
    offParticipantConnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantConnectedCallbacks = this.onParticipantConnectedCallbacks.filter(cb => cb !== callback);
    }

    onParticipantDisconnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantDisconnectedCallbacks.push(callback);
    }
    offParticipantDisconnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantDisconnectedCallbacks = this.onParticipantDisconnectedCallbacks.filter(cb => cb !== callback);
    }

    onTrackSubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackSubscribedCallbacks.push(callback);
    }
    offTrackSubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackSubscribedCallbacks = this.onTrackSubscribedCallbacks.filter(cb => cb !== callback);
    }

    onTrackUnsubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackUnsubscribedCallbacks.push(callback);
    }
    offTrackUnsubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackUnsubscribedCallbacks = this.onTrackUnsubscribedCallbacks.filter(cb => cb !== callback);
    }

    onTrackMuted(callback: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackMutedCallbacks.push(callback);
    }
    offTrackMuted(callback: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackMutedCallbacks = this.onTrackMutedCallbacks.filter(cb => cb !== callback);
    }

    onTrackUnmuted(callback: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackUnmutedCallbacks.push(callback);
    }
    offTrackUnmuted(callback: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackUnmutedCallbacks = this.onTrackUnmutedCallbacks.filter(cb => cb !== callback);
    }

    onLocalScreenShareStopped(callback: () => void): void {
        this.onLocalScreenShareStoppedCallbacks.push(callback);
    }
    offLocalScreenShareStopped(callback: () => void): void {
        this.onLocalScreenShareStoppedCallbacks = this.onLocalScreenShareStoppedCallbacks.filter(cb => cb !== callback);
    }

    private triggerLocalScreenShareStopped(): void {
        this.onLocalScreenShareStoppedCallbacks.forEach(cb => {
            try { cb(); } catch { /* noop */ }
        });
    }

    // Cleanup method
    cleanup(): void {
        console.log('Cleaning up LiveKit service...');

        // Force cleanup all remote tracks before disconnecting
        if (this.room) {
            const participants = Array.from(this.room.remoteParticipants.values());
            for (const participant of participants) {
                const publications = Array.from(participant.trackPublications.values());
                for (const publication of publications) {
                    if (publication.track) {
                        try {
                            // Trigger unsubscribe callbacks for cleanup
                            this.triggerTrackUnsubscribed(
                                publication.track as RemoteTrack,
                                publication as RemoteTrackPublication,
                                participant
                            );
                        } catch {}
                    }
                }
            }
        }

        this.disconnectFromRoom();
        this.onParticipantConnectedCallbacks = [];
        this.onParticipantDisconnectedCallbacks = [];
        this.onTrackSubscribedCallbacks = [];
        this.onTrackUnsubscribedCallbacks = [];
        this.onLocalScreenShareStoppedCallbacks = [];
        this.onTrackMutedCallbacks = [];
        this.onTrackUnmutedCallbacks = [];
    }
}

export const livekitService = new LiveKitService();
