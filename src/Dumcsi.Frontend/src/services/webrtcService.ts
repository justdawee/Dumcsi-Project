import type { SignalRService } from './signalrService';
import type {EntityId} from './types';

interface ConnectionInfo {
    userId: EntityId;
    connectionId: string;
}

class WebRtcService {
    private peers = new Map<string, RTCPeerConnection>();
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
            this.localStream = await navigator.mediaDevices.getUserMedia({audio: true});
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
            await this.createPeerConnection(connectionId, true);
        }
    }

    removeUser(connectionId: string) {
        const pc = this.peers.get(connectionId);
        if (pc) {
            pc.close();
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
        const pc = new RTCPeerConnection({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
        this.peers.set(targetConnectionId, pc);

        if (this.localStream) {
            for (const track of this.localStream.getTracks()) {
                pc.addTrack(track, this.localStream);
            }
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && this.signalRService) {
                this.signalRService.sendIceCandidate(targetConnectionId, e.candidate);
            }
        };

        pc.ontrack = (e) => {
            let audio = this.audioElements.get(targetConnectionId);
            if (!audio) {
                audio = new Audio();
                audio.autoplay = true;
                this.audioElements.set(targetConnectionId, audio);
                document.body.appendChild(audio);
            }
            audio.srcObject = e.streams[0];
        };

        if (initiator && this.signalRService) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await this.signalRService.sendOffer(targetConnectionId, offer);
        }

        return pc;
    }

    private async handleReceiveOffer(fromConnectionId: string, offer: any) {
        await this.createPeerConnection(fromConnectionId, false);
        const pc = this.peers.get(fromConnectionId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (this.signalRService) {
            await this.signalRService.sendAnswer(fromConnectionId, answer);
        }
    }

    private async handleReceiveAnswer(fromConnectionId: string, answer: any) {
        const pc = this.peers.get(fromConnectionId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }

    private async handleReceiveIceCandidate(fromConnectionId: string, candidate: any) {
        const pc = this.peers.get(fromConnectionId);
        if (!pc) return;
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error('Error adding ICE candidate', err);
        }
    }

    setMuted(muted: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(t => t.enabled = !muted);
        }
    }

    leaveChannel() {
        for (const id of Array.from(this.peers.keys())) {
            this.removeUser(id);
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
    }
}

export const webrtcService = new WebRtcService();