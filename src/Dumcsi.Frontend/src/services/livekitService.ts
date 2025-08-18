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

// Note: PascalCase property names are required by the backend
// LiveKit controller. Using camelCase here would result in
// a 400 Bad Request response because the properties would not
// bind correctly on the server.
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
    private screenShareTrack: LocalTrackPublication | null = null;
    private onParticipantConnectedCallbacks: ((participant: RemoteParticipant) => void)[] = [];
    private onParticipantDisconnectedCallbacks: ((participant: RemoteParticipant) => void)[] = [];
    private onTrackSubscribedCallbacks: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void)[] = [];
    private onTrackUnsubscribedCallbacks: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void)[] = [];
    private onLocalScreenShareStoppedCallbacks: Array<() => void> = [];

    async getServerInfo(): Promise<LiveKitServerInfo> {
        // Check for environment variable first
        const envUrl = import.meta.env.VITE_LIVEKIT_URL;
        
        // Default to configured server, with localhost fallback for development
        const defaultUrl = envUrl || 'ws://192.168.0.50:7880';
        
        // minimal server info without verbose logging
        
        return {
            url: defaultUrl,
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
        try {
            // Use default participant name if not provided
            const effectiveParticipantName = participantName || `user_${Date.now()}`;
            
            if (this.room) {
                await this.disconnectFromRoom();
            }

            const serverInfo = await this.getServerInfo();
            
            const roomName = `channel_${channelId}`;
            
            const token = await this.getAccessToken(roomName, effectiveParticipantName);

            // Create room with proper LiveKit options
            this.room = new Room({
                // Enable adaptive streaming
                adaptiveStream: true,
                // Dynacast for better bandwidth management
                dynacast: true,
            });
            
            this.setupRoomEventListeners();

            
            
            // Connect with enhanced WebRTC configuration
            await this.room.connect(serverInfo.url, token, {
                // Configure ICE servers for better NAT traversal
                rtcConfig: {
                    iceServers: [
                        // Google's public STUN servers
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        // Additional STUN servers for redundancy
                        { urls: 'stun:stun.cloudflare.com:3478' },
                    ],
                    iceCandidatePoolSize: 10,
                },
                // Auto-subscribe to tracks
                autoSubscribe: true,
            });
            this.isConnected = true;
        } catch (error) {
            console.error(`❌ Failed to connect to LiveKit room:`, error);
            
            // Provide more specific error information
            if (error instanceof Error) {
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                
                // Check for common connection issues
                if (error.message.includes('could not establish pc connection')) {
                    console.error('💡 WebRTC peer connection failed. This could be due to:');
                    console.error('   - Network connectivity issues');
                    console.error('   - Firewall blocking WebRTC traffic');
                    console.error('   - NAT traversal problems (STUN/TURN configuration)');
                    console.error('   - LiveKit server WebRTC configuration issues');
                }
            }
            
            throw error;
        }
    }

    async disconnectFromRoom(): Promise<void> {
        if (this.room) {
            if (this.screenShareTrack) {
                await this.stopScreenShare();
            }
            
            await this.room.disconnect();
            this.room = null;
            this.isConnected = false;
            
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
                // Use the simplified LiveKit API for basic screen sharing
                await this.room.localParticipant.setScreenShareEnabled(true);
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

    onParticipantDisconnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantDisconnectedCallbacks.push(callback);
    }

    onTrackSubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackSubscribedCallbacks.push(callback);
    }

    onTrackUnsubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackUnsubscribedCallbacks.push(callback);
    }

    onLocalScreenShareStopped(callback: () => void): void {
        this.onLocalScreenShareStoppedCallbacks.push(callback);
    }

    private triggerLocalScreenShareStopped(): void {
        this.onLocalScreenShareStoppedCallbacks.forEach(cb => {
            try { cb(); } catch { /* noop */ }
        });
    }

    // Cleanup method
    cleanup(): void {
        this.disconnectFromRoom();
        this.onParticipantConnectedCallbacks = [];
        this.onParticipantDisconnectedCallbacks = [];
        this.onTrackSubscribedCallbacks = [];
        this.onTrackUnsubscribedCallbacks = [];
        this.onLocalScreenShareStoppedCallbacks = [];
    }
}

export const livekitService = new LiveKitService();
