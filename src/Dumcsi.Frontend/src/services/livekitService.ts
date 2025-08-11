import { 
    Room, 
    RoomEvent, 
    RemoteParticipant, 
    LocalParticipant, 
    Track,
    LocalTrackPublication,
    RemoteTrackPublication,
    RemoteTrack,
    ConnectionState
} from 'livekit-client';
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

export class LiveKitService {
    private room: Room | null = null;
    private isConnected = false;
    private screenShareTrack: LocalTrackPublication | null = null;
    private onParticipantConnectedCallback: ((participant: RemoteParticipant) => void) | null = null;
    private onParticipantDisconnectedCallback: ((participant: RemoteParticipant) => void) | null = null;
    private onTrackSubscribedCallback: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void) | null = null;
    private onTrackUnsubscribedCallback: ((track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void) | null = null;

    async getServerInfo(): Promise<LiveKitServerInfo> {
        // For now, return the default LiveKit server configuration
        // The backend endpoint doesn't return server URL yet
        return {
            url: import.meta.env.VITE_LIVEKIT_URL || 'ws://192.168.0.50:7880',
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

    async connectToRoom(channelId: EntityId, participantName: string): Promise<void> {
        try {
            if (this.room) {
                await this.disconnectFromRoom();
            }

            const serverInfo = await this.getServerInfo();
            const token = await this.getAccessToken(`channel_${channelId}`, participantName);

            this.room = new Room();
            this.setupRoomEventListeners();

            await this.room.connect(serverInfo.url, token);
            this.isConnected = true;
            
            console.log('Successfully connected to LiveKit room');
        } catch (error) {
            console.error('Failed to connect to LiveKit room:', error);
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
            console.log('Disconnected from LiveKit room');
        }
    }

    async startScreenShare(): Promise<void> {
        if (!this.room || !this.isConnected) {
            throw new Error('Not connected to room');
        }

        if (this.isScreenSharing()) {
            console.warn('Screen share already active');
            return;
        }

        try {
            // Use the simplified LiveKit API
            await this.room.localParticipant.setScreenShareEnabled(true);
            
            // Update our tracking
            this.updateScreenShareTrack();
            console.log('Screen share started successfully');
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
            console.log('Screen share stopped successfully');
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

    getRoom(): Room | null {
        return this.room;
    }

    getRemoteParticipants(): RemoteParticipant[] {
        if (!this.room) return [];
        return Array.from(this.room.remoteParticipants.values());
    }

    getLocalParticipant(): LocalParticipant | null {
        return this.room?.localParticipant || null;
    }

    private setupRoomEventListeners(): void {
        if (!this.room) return;

        this.room.on(RoomEvent.Connected, () => {
            console.log('Room connected');
        });

        this.room.on(RoomEvent.Disconnected, (reason) => {
            console.log('Room disconnected:', reason);
            this.isConnected = false;
        });

        this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log('Participant connected:', participant.identity);
            if (this.onParticipantConnectedCallback) {
                this.onParticipantConnectedCallback(participant);
            }
        });

        this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log('Participant disconnected:', participant.identity);
            if (this.onParticipantDisconnectedCallback) {
                this.onParticipantDisconnectedCallback(participant);
            }
        });

        this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            console.log('Track subscribed:', track.kind, 'from', participant.identity);
            if (this.onTrackSubscribedCallback) {
                this.onTrackSubscribedCallback(track, publication, participant);
            }
        });

        this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
            if (this.onTrackUnsubscribedCallback) {
                this.onTrackUnsubscribedCallback(track, publication, participant);
            }
        });

        this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            console.log('Connection state changed:', state);
        });
    }

    // Event listener registration methods
    onParticipantConnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantConnectedCallback = callback;
    }

    onParticipantDisconnected(callback: (participant: RemoteParticipant) => void): void {
        this.onParticipantDisconnectedCallback = callback;
    }

    onTrackSubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackSubscribedCallback = callback;
    }

    onTrackUnsubscribed(callback: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
        this.onTrackUnsubscribedCallback = callback;
    }

    // Cleanup method
    cleanup(): void {
        this.disconnectFromRoom();
        this.onParticipantConnectedCallback = null;
        this.onParticipantDisconnectedCallback = null;
        this.onTrackSubscribedCallback = null;
        this.onTrackUnsubscribedCallback = null;
    }
}

export const livekitService = new LiveKitService();