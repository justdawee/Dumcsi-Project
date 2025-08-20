import type { SignalRService } from './signalrService';
import type { EntityId } from './types';
import { useAudioSettings } from '@/composables/useAudioSettings';
import { useAppStore } from '@/stores/app';

// Load SimplePeer from CDN
let SimplePeer: any = null;

const loadSimplePeer = async () => {
    if (SimplePeer) return SimplePeer;
    
    // Load SimplePeer from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
        script.onload = () => {
            SimplePeer = (window as any).SimplePeer;
            resolve(SimplePeer);
        };
        script.onerror = reject;
    });
};

interface ConnectionInfo {
    userId: EntityId;
    connectionId: string;
}

class WebRtcService {
    private peers = new Map<string, any>();
    private audioElements = new Map<string, HTMLAudioElement>();
    private localStream: MediaStream | null = null;
    private signalRService: SignalRService | null = null;
    private connectionIdToUserId = new Map<string, EntityId>();
    private onRemoteStreamCallbacks: Array<(userId: EntityId, stream: MediaStream) => void> = [];
    private onLocalStreamCallbacks: Array<(stream: MediaStream) => void> = [];
    private lastOfferSdp = new Map<string, string>();
    private lastAnswerSdp = new Map<string, string>();
    private isMutedForTesting = false;
    private globalMuted = false; // explicit user mute state (independent of PTT)
    private pttMode = false;     // push-to-talk mode enabled
    private pttActive = false;   // push-to-talk key currently pressed
    private settingsCleanup: (() => void) | null = null;
    private isDeafened = false;
    private isInVoiceChannel = false; // Track if we should have microphone access
    
    // Audio settings integration
    private audioSettings = useAudioSettings();

    constructor() {
        // Handle page unload to clean up connections
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });

            window.addEventListener('unload', () => {
                this.cleanup();
            });
        }
    }

    setSignalRService(service: SignalRService) {
        this.signalRService = service;
        service.on('ReceiveOffer', this.handleReceiveOffer.bind(this));
        service.on('ReceiveAnswer', this.handleReceiveAnswer.bind(this));
        service.on('ReceiveIceCandidate', this.handleReceiveIceCandidate.bind(this));
    }

    private async ensureLocalStream() {
        if (!this.localStream && this.isInVoiceChannel) {
            await this.createLocalStream();
        }
    }

    private async createLocalStream() {
        const { audioSettings } = this.audioSettings;
        
        // Create stream with current audio settings
        const originalStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: audioSettings.inputDevice !== 'default' ? audioSettings.inputDevice : undefined,
                echoCancellation: audioSettings.echoCancellation,
                noiseSuppression: audioSettings.noiseSuppression,
                autoGainControl: audioSettings.autoGainControl
            }
        });

        // Keep the original stream for peer connections
        this.localStream = originalStream;

        // Set up audio processing chain for volume control
        this.setupAudioProcessing();

        // Listen for settings changes
        this.setupSettingsListener();

        // Notify listeners that a (new) local stream is available
        try { this.onLocalStreamCallbacks.forEach(cb => { try { cb(this.localStream!); } catch {} }); } catch {}
        // Apply current mute/PTT gating to the new stream
        this.updateTrackEnabled();
    }

    private setupAudioProcessing() {
        if (!this.localStream) return;

        // Update audio settings based on current configuration
        this.updateInputVolume();
        // Ensure track enabled state reflects current PTT/mute configuration
        this.updateTrackEnabled();
    }

    private setupSettingsListener() {
        // Clean up previous listener
        if (this.settingsCleanup) {
            this.settingsCleanup();
        }

        // Listen for audio settings changes
        this.settingsCleanup = this.audioSettings.onSettingsChange((settings) => {
            this.handleSettingsChange(settings);
        });
    }

    async connectToExisting(_channelId: EntityId, infos: ConnectionInfo[]) {
        // Only start local stream if we don't have one already (i.e., when we first join)
        await this.ensureLocalStream();
        const appStore = useAppStore();
        const selfId = appStore.currentUserId;
        for (const info of infos) {
            // Do not attempt to connect to ourselves
            if (selfId && info.userId === selfId) continue;
            this.connectionIdToUserId.set(info.connectionId, info.userId);
            if (!this.peers.has(info.connectionId)) {
                await this.createPeerConnection(info.connectionId, true);
            }
        }
    }

    async addUser(_channelId: EntityId, _userId: EntityId, connectionId: string) {
        await this.ensureLocalStream();
        const appStore = useAppStore();
        const selfId = appStore.currentUserId;
        if (selfId && _userId === selfId) return;
        this.connectionIdToUserId.set(connectionId, _userId);
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
        this.connectionIdToUserId.delete(connectionId);
        const audio = this.audioElements.get(connectionId);
        if (audio) {
            audio.srcObject = null;
            audio.remove();
            this.audioElements.delete(connectionId);
        }
    }

    private async createPeerConnection(targetConnectionId: string, initiator: boolean) {
        await this.ensureLocalStream();
        
        // Ensure SimplePeer is loaded
        const SimplePeerClass = await loadSimplePeer();
        
        const peerConfig: any = {
            initiator,
            config: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            }
        };

        // Only add stream if we have one (i.e., if we're in voice channel)
        if (this.localStream) {
            peerConfig.stream = this.localStream;
        }

        const peer = new SimplePeerClass(peerConfig);
        // Track role to prevent glare (ignore offers on initiator peers)
        (peer as any).__initiator = !!initiator;

        this.peers.set(targetConnectionId, peer);

        // Handle signaling data (offers, answers, ice candidates)
        peer.on('signal', (data: any) => {
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
        peer.on('stream', (stream: any) => {
            let audio = this.audioElements.get(targetConnectionId);
            if (!audio) {
                audio = new Audio();
                audio.autoplay = true;
                this.audioElements.set(targetConnectionId, audio);
                document.body.appendChild(audio);
            }
            audio.srcObject = stream;
            
            // Explicitly try to play the audio
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => { /* ignore autoplay failures */ });
            }

            // Notify listeners with mapped userId if available
            const userId = this.connectionIdToUserId.get(targetConnectionId);
            if (userId !== undefined) {
                try { this.onRemoteStreamCallbacks.forEach(cb => { try { cb(userId, stream); } catch {} }); } catch {}
            }
        });

        // Handle connection events
        peer.on('connect', () => {
            // Send our initial voice state over data channel
            try {
                const payload = JSON.stringify({ t: 'voice_state', muted: this.getMutedState(), deafened: this.isDeafened });
                peer.send(payload);
            } catch {}
        });

        peer.on('close', () => {
            this.removeUser(targetConnectionId);
        });

        peer.on('error', (err: any) => {
            console.error('Peer error:', err);
            this.removeUser(targetConnectionId);
        });

        // Receive data channel messages (e.g., voice state)
        peer.on('data', (buf: any) => {
            try {
                const msg = JSON.parse(buf.toString());
                if (msg && msg.t === 'voice_state') {
                    const appStore = useAppStore();
                    const channelId = appStore.currentVoiceChannelId;
                    if (!channelId) return;
                    const connMap = appStore.voiceChannelConnections.get(channelId);
                    if (!connMap) return;
                    let userId: EntityId | undefined;
                    connMap.forEach((cid, uid) => { if (cid === targetConnectionId) userId = uid; });
                    if (userId !== undefined) {
                        appStore.setUserVoiceState(channelId, userId, { muted: !!msg.muted, deafened: !!msg.deafened });
                    }
                }
            } catch {}
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

            // If this peer is our initiator side, ignore incoming offers to avoid glare
            if ((peer as any).__initiator) {
                return;
            }

            // Deduplicate identical offers
            if (offer?.sdp && this.lastOfferSdp.get(fromConnectionId) === offer.sdp) {
                return;
            }

            // Only accept an offer when in a stable state
            const pc: RTCPeerConnection | undefined = (peer as any)?._pc;
            if (pc) {
                const state = pc.signalingState;
                if (state !== 'stable') {
                    // Ignore duplicate/late offers
                    return;
                }
            }

            // Signal the offer to simple-peer
            peer.signal(offer);
            if (offer?.sdp) this.lastOfferSdp.set(fromConnectionId, offer.sdp);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    private async handleReceiveAnswer(fromConnectionId: string, answer: any) {
        try {
            const peer = this.peers.get(fromConnectionId);
            if (!peer) return;

            // Deduplicate identical answers
            if (answer?.sdp && this.lastAnswerSdp.get(fromConnectionId) === answer.sdp) {
                return;
            }

            // Guard against invalid state for applying an answer
            const pc: RTCPeerConnection | undefined = (peer as any)?._pc;
            if (pc) {
                const state = pc.signalingState;
                // Only accept an answer when we have a local offer outstanding
                if (state !== 'have-local-offer' && state !== 'have-local-pranswer') {
                    // Ignore duplicate/late answers or glare scenarios
                    return;
                }
            }

            // Signal the answer to simple-peer
            peer.signal(answer);
            if (answer?.sdp) this.lastAnswerSdp.set(fromConnectionId, answer.sdp);
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

    private async handleSettingsChange(settings: any) {
        // react to audio settings change
        
        // Update input volume in real-time
        this.updateInputVolume();
        
        // Update output volume for all audio elements
        this.updateOutputVolume();
        
        // If device changed, we need to recreate the stream
        if (this.shouldRecreateStream(settings)) {
            await this.recreateStream();
        }
    }

    private shouldRecreateStream(settings: any): boolean {
        if (!this.localStream) return false;
        
        // Check if critical settings that require stream recreation have changed
        const currentTrack = this.localStream.getAudioTracks()[0];
        if (!currentTrack) return true;
        
        const currentSettings = currentTrack.getSettings();
        
        return (
            (settings.inputDevice !== 'default' && currentSettings.deviceId !== settings.inputDevice) ||
            currentSettings.echoCancellation !== settings.echoCancellation ||
            currentSettings.noiseSuppression !== settings.noiseSuppression ||
            currentSettings.autoGainControl !== settings.autoGainControl
        );
    }

    private async recreateStream() {
        // recreate stream with new settings
        
        // Stop current stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Create new stream
        await this.createLocalStream();
        
        // Update all peer connections with new stream
        this.updatePeerStreams();
    }

    private updatePeerStreams() {
        if (!this.localStream) return;
        
        // Update all peer connections with the new stream
        this.peers.forEach((peer) => {
            // Remove old tracks and add new ones
            const sender = (peer as any)._pc?.getSenders?.();
            if (sender) {
                sender.forEach((s: RTCRtpSender) => {
                    if (s.track?.kind === 'audio') {
                        const newTrack = this.localStream?.getAudioTracks()[0];
                        if (newTrack) {
                            s.replaceTrack(newTrack);
                        }
                    }
                });
            }
        });
    }

    private updateInputVolume() {
        if (this.localStream) {
            const { audioSettings } = this.audioSettings;
            let volume = audioSettings.inputVolume / 100;
            
            // Apply mute/volume to audio tracks directly
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                // Use enabled for mute/unmute
                track.enabled = !this.isMutedForTesting && volume > 0;
            });
        }
    }

    private updateOutputVolume() {
        const { audioSettings } = this.audioSettings;
        const volume = this.isDeafened ? 0 : (audioSettings.outputVolume / 100);
        
        // Update all audio elements
        this.audioElements.forEach((audio) => {
            audio.volume = volume;
            
            // Try to set output device if supported
            if ('setSinkId' in audio && audioSettings.outputDevice !== 'default') {
                (audio as any).setSinkId(audioSettings.outputDevice).catch((error: any) => {
                    console.warn('Failed to set audio output device:', error);
                });
            }
        });
    }

    // Method to mute during microphone testing
    setMutedForTesting(muted: boolean) {
        this.isMutedForTesting = muted;
        this.updateTrackEnabled();
    }

    setMuted(muted: boolean) {
        this.globalMuted = muted;
        this.updateTrackEnabled();
        // Only broadcast and notify if we're actually in a voice channel
        if (this.isInVoiceChannel) {
            this.broadcastVoiceState();
            this.notifySignalRVoiceState();
        }
    }

    setDeafened(deafened: boolean) {
        this.isDeafened = deafened;
        this.updateOutputVolume();
        // Only broadcast and notify if we're actually in a voice channel
        if (this.isInVoiceChannel) {
            this.broadcastVoiceState();
            this.notifySignalRVoiceState();
        }
    }

    private getMutedState(): boolean {
        return this.globalMuted;
    }

    private broadcastVoiceState() {
        const payload = JSON.stringify({ t: 'voice_state', muted: this.getMutedState(), deafened: this.isDeafened });
        this.peers.forEach((p) => {
            try { p.send(payload); } catch {}
        });
    }

    private notifySignalRVoiceState() {
        if (this.signalRService && this.isInVoiceChannel) {
            const appStore = useAppStore();
            const currentVoiceChannelId = appStore.currentVoiceChannelId;
            if (currentVoiceChannelId) {
                this.signalRService.updateVoiceState(currentVoiceChannelId, this.getMutedState(), this.isDeafened);
            }
        }
    }

    async joinVoiceChannel() {
        this.isInVoiceChannel = true;
        await this.ensureLocalStream();
        this.updateTrackEnabled();
    }

    leaveChannel() {
        this.isInVoiceChannel = false;
        
        for (const id of Array.from(this.peers.keys())) {
            this.removeUser(id);
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.isDeafened = false;
    }

    private cleanup() {
        // Mark as not in voice channel
        this.isInVoiceChannel = false;
        
        // Clean up peer connections
        for (const id of Array.from(this.peers.keys())) {
            this.removeUser(id);
        }
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Clean up settings listener
        if (this.settingsCleanup) {
            this.settingsCleanup();
            this.settingsCleanup = null;
        }
    }

    // External subscriptions
    onRemoteStream(callback: (userId: EntityId, stream: MediaStream) => void) {
        this.onRemoteStreamCallbacks.push(callback);
    }

    onLocalStream(callback: (stream: MediaStream) => void) {
        this.onLocalStreamCallbacks.push(callback);
        if (this.localStream) {
            try { callback(this.localStream); } catch {}
        }
    }

    // Centralized logic for whether mic track should be enabled
    private updateTrackEnabled() {
        if (!this.localStream) return;
        const { audioSettings } = this.audioSettings;
        const volumeOk = (audioSettings.inputVolume / 100) > 0;
        const shouldEnable = !this.isMutedForTesting
            && !this.globalMuted
            && volumeOk
            && (!this.pttMode || this.pttActive);

        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = shouldEnable;
        });
    }

    // Push-to-talk controls (do not broadcast mute state)
    setPTTMode(enabled: boolean) {
        this.pttMode = enabled;
        if (enabled) this.pttActive = false;
        this.updateTrackEnabled();
    }

    setPTTActive(active: boolean) {
        this.pttActive = active;
        this.updateTrackEnabled();
    }
}

export const webrtcService = new WebRtcService();
