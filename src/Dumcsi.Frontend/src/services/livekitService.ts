import { 
    Room, 
    RoomEvent, 
    RemoteParticipant, 
    LocalParticipant, 
    createLocalScreenTracks,
    Track,
    LocalTrackPublication,
    RemoteTrackPublication,
    RemoteTrack,
    ConnectionState
} from 'livekit-client';
import api from './api';
import type { EntityId } from './types';

export interface LiveKitTokenRequest {
    roomName: string;
    participantName: string;
    role?: number; // 0=Subscriber, 1=Publisher, 2=Admin  
    tokenExpirationMinutes?: number;
}

export interface LiveKitServerInfo {
    url: string;
    version: string;
}

class LiveKitService {
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
            url: import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880',
            version: '1.0.0'
        };
    }

    async getAccessToken(roomName: string, participantName: string): Promise<string> {
        const response = await api.post('/LiveKit/token', {
            roomName,
            participantName,
            role: 1, // Publisher role to allow screen sharing
            tokenExpirationMinutes: 360
        });
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

        if (this.screenShareTrack) {
            console.warn('Screen share already active');
            return;
        }

        try {
            const tracks = await createLocalScreenTracks({
                audio: true,
                video: true
            });

            for (const track of tracks) {
                const publication = await this.room.localParticipant.publishTrack(track, {
                    source: Track.Source.ScreenShare
                });
                
                if (track.kind === 'video') {
                    this.screenShareTrack = publication;
                }
            }

            console.log('Screen share started successfully');
        } catch (error) {
            console.error('Failed to start screen share:', error);
            throw error;
        }
    }

    async stopScreenShare(): Promise<void> {
        if (!this.room || !this.screenShareTrack) {
            return;
        }

        try {
            await this.room.localParticipant.unpublishTrack(this.screenShareTrack.track!);
            this.screenShareTrack = null;
            console.log('Screen share stopped successfully');
        } catch (error) {
            console.error('Failed to stop screen share:', error);
            throw error;
        }
    }

    isScreenSharing(): boolean {
        return this.screenShareTrack !== null;
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