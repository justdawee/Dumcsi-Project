import SimplePeer from 'simple-peer';
import type { SignalRService } from './signalrService';
import type { EntityId } from './types';

interface ConnectionInfo {
    userId: EntityId;
    connectionId: string;
}

class WebRtcService {
    private peers = new Map<string, SimplePeer.Instance>();
    private audioElements = new Map<string, HTMLAudioElement>();
    private localStream: MediaStream | null = null;
    private signalRService: SignalRService | null = null;

    setSignalRService(service: SignalRService) {
        this.signalRService = service;
        service.on('ReceiveOffer', this.handleReceiveOffer.bind(this));
        service.on('ReceiveAnswer', this.handleReceiveAnswer.bind(this));
        service.on('ReceiveIceCandidate', this.handleReceiveIceCandidate.bind(this));
    }

    private async ensureLocalStream() {
        if (!this.localStream) {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
    }

    async connectToExisting(_channelId: EntityId, infos: ConnectionInfo[]) {
        await this.ensureLocalStream();
        for (const info of infos) {
            if (!this.peers.has(info.connectionId)) {
                await this.createPeerConnection(info.connectionId, true);
            }
        }
    }

    async addUser(_channelId: EntityId, _userId: EntityId, connectionId: string) {
        await this.ensureLocalStream();
        if (!this.peers.has(connectionId)) {
            // Existing users don't initiate connection, they wait for offers from new users
            await this.createPeerConnection(connectionId, false);
        }
    }

    removeUser(connectionId: string) {
        const peer = this.peers.get(connectionId);
        if (peer) {
            peer.destroy();
            this.peers.delete(connectionId);
        }
        const audio = this.audioElements.get(connectionId);
        if (audio) {
            audio.srcObject = null;
            audio.remove();
            this.audioElements.delete(connectionId);
        }
    }

    private async createPeerConnection(targetConnectionId: string, initiator: boolean) {
        await this.ensureLocalStream();
        
        const peerConfig: SimplePeer.Options = {
            initiator,
            config: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            }
        };

        // Only add stream if we have one
        if (this.localStream) {
            peerConfig.stream = this.localStream;
        }

        const peer = new SimplePeer(peerConfig);

        this.peers.set(targetConnectionId, peer);

        // Handle signaling data (offers, answers, ice candidates)
        peer.on('signal', (data) => {
            if (!this.signalRService) return;

            if (data.type === 'offer') {
                this.signalRService.sendOffer(targetConnectionId, data);
            } else if (data.type === 'answer') {
                this.signalRService.sendAnswer(targetConnectionId, data);
            } else if ('candidate' in data && data.candidate) {
                // ICE candidate
                this.signalRService.sendIceCandidate(targetConnectionId, data);
            }
        });

        // Handle incoming stream
        peer.on('stream', (stream) => {
            let audio = this.audioElements.get(targetConnectionId);
            if (!audio) {
                audio = new Audio();
                audio.autoplay = true;
                this.audioElements.set(targetConnectionId, audio);
                document.body.appendChild(audio);
            }
            audio.srcObject = stream;
        });

        // Handle connection events
        peer.on('connect', () => {
            console.log('Peer connected:', targetConnectionId);
        });

        peer.on('close', () => {
            console.log('Peer connection closed:', targetConnectionId);
            this.removeUser(targetConnectionId);
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            this.removeUser(targetConnectionId);
        });

        return peer;
    }

    private async handleReceiveOffer(fromConnectionId: string, offer: any) {
        try {
            // If we don't have a peer connection yet, create one (non-initiator)
            if (!this.peers.has(fromConnectionId)) {
                await this.createPeerConnection(fromConnectionId, false);
            }
            
            const peer = this.peers.get(fromConnectionId);
            if (!peer) return;

            // Signal the offer to simple-peer
            peer.signal(offer);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    private async handleReceiveAnswer(fromConnectionId: string, answer: any) {
        try {
            const peer = this.peers.get(fromConnectionId);
            if (!peer) return;

            // Signal the answer to simple-peer
            peer.signal(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    private async handleReceiveIceCandidate(fromConnectionId: string, candidate: any) {
        try {
            const peer = this.peers.get(fromConnectionId);
            if (!peer) return;

            // Signal the ICE candidate to simple-peer
            peer.signal(candidate);
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    setMuted(muted: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => track.enabled = !muted);
        }
    }

    leaveChannel() {
        for (const id of Array.from(this.peers.keys())) {
            this.removeUser(id);
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }
}

export const webrtcService = new WebRtcService();