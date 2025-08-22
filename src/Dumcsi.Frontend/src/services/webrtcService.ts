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
    // Fixed audio quality: Stereo Opus 128 kbps for music/content
    private static readonly FIXED_AUDIO_BPS = 128_000; // 128 kbps
    private peers = new Map<string, any>();
    private audioElements = new Map<string, HTMLAudioElement>();
    private localStream: MediaStream | null = null; // stream used for sending (gated)
    private vadInputStream: MediaStream | null = null; // stream used for VAD (always enabled)
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
    // Voice activity detection (VAD)
    private audioCtx: AudioContext | null = null;
    private vadAnalyser: AnalyserNode | null = null;
    private vadSource: MediaStreamAudioSourceNode | null = null;
    private vadRaf: number | null = null;
    private vadActive = false;
    private vadLastVoiceTs = 0;
    // Stats tracking per peer connection for bitrate/packet-loss calculations
    private statsPrev = new Map<string, {
        inboundBytes: number;
        outboundBytes: number;
        inboundPackets: number;
        inboundPacketsLost: number;
        ts: number; // ms
        rttMs?: number;
    }>();
    private voiceConnectedAt: number | null = null;
    
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
        
        // Base audio constraints + fixed high-quality capture
        let audioConstraints: MediaTrackConstraints = {
            deviceId: audioSettings.inputDevice !== 'default' ? audioSettings.inputDevice : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 2,
            sampleRate: 48000
        };
        
        // Create stream with current audio settings and fixed quality
        const originalStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
        });

        // Set contentHint based on selected mode (helps browsers tune processing)
        try {
            const track = originalStream.getAudioTracks()[0];
            if (track && 'contentHint' in track) { (track as any).contentHint = 'music'; }
        } catch {}

        // Split capture: use one track for VAD analysis (always enabled) and a cloned track for sending (gated)
        const inputTrack = originalStream.getAudioTracks()[0];
        this.vadInputStream = new MediaStream([inputTrack]);
        const sendTrack = inputTrack.clone();
        this.localStream = new MediaStream([sendTrack]);

        // Set up audio processing chain for volume control
        this.setupAudioProcessing();

        // Listen for settings changes
        this.setupSettingsListener();

        // Notify listeners that a (new) local stream is available
        try { this.onLocalStreamCallbacks.forEach(cb => { try { cb(this.localStream!); } catch {} }); } catch {}
        // Apply current mute/PTT gating to the new stream
        this.updateTrackEnabled();

        // Apply desired bitrate to any existing senders
        await this.applyAudioBitrateToSenders();
    }

    private setupAudioProcessing() {
        if (!this.localStream) return;

        // Update audio settings based on current configuration
        this.updateInputVolume();
        // Ensure track enabled state reflects current PTT/mute configuration
        this.updateTrackEnabled();
        // Start voice activity monitoring (used in voice-activity mode)
        this.startVadMonitoring();
    }

    

    // Apply outbound encoder parameters (e.g., max bitrate) to all audio senders
    private async applyAudioBitrateToSenders() {
        try {
            const appStore = useAppStore();
            const channelId = appStore.currentVoiceChannelId;
            if (!channelId) return;

            const targetBps = WebRtcService.FIXED_AUDIO_BPS;
            const dtx: 'enabled' | 'disabled' = 'disabled';

            this.peers.forEach((peer: any) => {
                const pc: RTCPeerConnection | undefined = peer?._pc;
                if (!pc) return;
                const senders = pc.getSenders?.() || [];
                senders.forEach((sender: RTCRtpSender) => {
                    if (sender.track && sender.track.kind === 'audio') {
                        try {
                            const params = sender.getParameters();
                            if (!params.encodings || params.encodings.length === 0) {
                                params.encodings = [{} as RTCRtpEncodingParameters];
                            }
                            // Set maxBitrate in bps based on desired quality
                            params.encodings[0].maxBitrate = targetBps;
                            // Try to control DTX (if supported)
                            try { (params.encodings[0] as any).dtx = dtx; } catch {}
                            try { (params.encodings[0] as any).priority = 'high'; } catch {}
                            sender.setParameters(params).catch(() => { /* ignore per-sender errors */ });
                            try { console.log('[Voice] Applied RTP sender maxBitrate (bps):', params.encodings[0].maxBitrate); } catch {}
                        } catch { /* ignore individual sender errors */ }
                    }
                });
            });
        } catch (e) {
            // Non-fatal; some browsers may not support setParameters on audio
        }
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

        // Single SDP transformer to enforce Opus params and bandwidth
        const transformOpusSdp = (sdp: string): string => {
            try {
                const FORCED_BPS = WebRtcService.FIXED_AUDIO_BPS;

                const lines = sdp.split(/\r?\n/);
                let opusPt: string | null = null;
                for (const line of lines) {
                    const m = line.match(/^a=rtpmap:(\d+) opus\/(\d+)(?:\/(\d+))?/i);
                    if (m) { opusPt = m[1]; break; }
                }
                if (!opusPt) return sdp;

                const fmtpIndex = lines.findIndex(l => l.startsWith(`a=fmtp:${opusPt}`));
                const params: Record<string, string> = {};
                if (fmtpIndex !== -1) {
                    const existing = lines[fmtpIndex].split(/\s+/).slice(1).join(' ');
                    const kv = existing.substring(existing.indexOf(':') + 1).split(';');
                    kv.forEach(pair => {
                        const [k, v] = pair.split('=').map((s: string) => s?.trim()).filter(Boolean) as [string, string];
                        if (k && v) params[k] = v;
                    });
                }

                params['maxaveragebitrate'] = String(FORCED_BPS);
                params['stereo'] = '1';
                params['sprop-stereo'] = '1';
                params['maxplaybackrate'] = '48000';
                params['usedtx'] = '0';
                params['cbr'] = '1';
                params['maxptime'] = '60';

                const paramStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(';');
                const newFmtp = `a=fmtp:${opusPt} ${paramStr}`;
                if (fmtpIndex !== -1) {
                    lines[fmtpIndex] = newFmtp;
                } else {
                    const rtpmapIdx = lines.findIndex(l => l.startsWith(`a=rtpmap:${opusPt}`));
                    if (rtpmapIdx !== -1) lines.splice(rtpmapIdx + 1, 0, newFmtp);
                    else lines.push(newFmtp);
                }

                // Ensure ptime line exists
                const hasPtime = lines.some(l => /^a=ptime:\d+/.test(l));
                if (!hasPtime) {
                    const mAudioIdx2 = lines.findIndex(l => l.startsWith('m=audio'));
                    if (mAudioIdx2 !== -1) {
                        let insertAt2 = mAudioIdx2 + 1;
                        const cIdx2 = lines.slice(mAudioIdx2).findIndex(l => l.startsWith('c='));
                        if (cIdx2 !== -1) insertAt2 = mAudioIdx2 + cIdx2 + 1;
                        lines.splice(insertAt2, 0, 'a=ptime:20');
                    } else {
                        lines.push('a=ptime:20');
                    }
                }

                // Also apply bandwidth lines to the audio m= section
                const tiabps = FORCED_BPS; // bps
                const askbps = Math.round(tiabps / 1000); // kbps
                const mAudioIdx = lines.findIndex(l => l.startsWith('m=audio'));
                if (mAudioIdx !== -1) {
                    let endIdx = lines.length;
                    for (let i = mAudioIdx + 1; i < lines.length; i++) {
                        if (lines[i].startsWith('m=')) { endIdx = i; break; }
                    }
                    const section = lines.slice(mAudioIdx, endIdx).filter(l => !l.startsWith('b=AS:') && !l.startsWith('b=TIAS:'));
                    let insertAt = mAudioIdx + 1;
                    const cLineIdx = section.findIndex(l => l.startsWith('c='));
                    if (cLineIdx !== -1) insertAt = mAudioIdx + cLineIdx + 1;
                    const newSection = [
                        ...section.slice(0, insertAt - mAudioIdx),
                        `b=TIAS:${tiabps}`,
                        `b=AS:${askbps}`,
                        ...section.slice(insertAt - mAudioIdx)
                    ];
                    lines.splice(mAudioIdx, endIdx - mAudioIdx, ...newSection);
                }
                return lines.join('\r\n');
            } catch {
                return sdp;
            }
        };

        const peerConfig: any = {
            initiator,
            config: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            },
            // Transform SDP before setLocalDescription/signaling to enforce Opus params
            sdpTransform: transformOpusSdp
        };

        // Only add stream if we have one (i.e., if we're in voice channel)
        if (this.localStream) {
            peerConfig.stream = this.localStream;
        }

        const peer = new SimplePeerClass(peerConfig);
        // Track role to prevent glare (ignore offers on initiator peers)
        (peer as any).__initiator = !!initiator;

        this.peers.set(targetConnectionId, peer);

        // Use the same transformer for any outgoing offers/answers

        // Handle signaling data (offers, answers, ice candidates)
        peer.on('signal', async (data: any) => {
            if (!this.signalRService) return;

            // Enforce Opus bitrate/stereo on outgoing SDP
            if ((data.type === 'offer' || data.type === 'answer') && typeof data.sdp === 'string') {
                data = { ...data, sdp: transformOpusSdp(data.sdp) };
            }

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

            // Apply current desired audio bitrate to this peer's sender when connected
            this.applyAudioBitrateToSenders();
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
        // React to audio settings change

        // Update input/output volume representations
        this.updateInputVolume();
        this.updateOutputVolume();

        // If device/processing changed, we need to recreate the stream
        if (this.shouldRecreateStream(settings)) {
            await this.recreateStream();
        }

        // Always re-evaluate mic gating after any settings change
        // so PTT/voice-activity and mute states remain authoritative
        this.updateTrackEnabled();
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

        // After replacing tracks, re-apply desired bitrate to senders
        this.applyAudioBitrateToSenders();
    }

    private updateInputVolume() {
        if (!this.localStream) return;
        // Currently we don't scale mic amplitude here; we only gate it via updateTrackEnabled.
        // Keep this method for future gain-node based input scaling if needed.
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

    // Map sensitivity (0-100, higher = more sensitive) to a normalized threshold (0-1)
    private getVadThreshold(sensitivity: number): number {
        const n = Math.min(100, Math.max(0, sensitivity)) / 100;
        const minThr = 0.02; // highest sensitivity -> lowest threshold (more sensitive)
        const maxThr = 0.6;  // lowest sensitivity -> highest threshold
        return maxThr - n * (maxThr - minThr);
    }

    // Begin monitoring mic level for voice-activity mode
    private startVadMonitoring() {
        this.stopVadMonitoring();
        if (!this.vadInputStream) return;
        try {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.vadAnalyser = this.audioCtx.createAnalyser();
            this.vadAnalyser.fftSize = 2048;
            this.vadAnalyser.minDecibels = -90;
            this.vadAnalyser.maxDecibels = -10;
            this.vadAnalyser.smoothingTimeConstant = 0.85;

            this.vadSource = this.audioCtx.createMediaStreamSource(this.vadInputStream);
            this.vadSource.connect(this.vadAnalyser);

            const data = new Uint8Array(this.vadAnalyser.fftSize);
            const loop = () => {
                if (!this.vadAnalyser) return;
                this.vadAnalyser.getByteTimeDomainData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) {
                    const s = (data[i] - 128) / 128; // -1..1
                    sum += s * s;
                }
                const rms = Math.sqrt(sum / data.length);
                const level = Math.min(1, rms * 8); // match settings UI scaling

                const { audioSettings } = this.audioSettings;
                const thr = this.getVadThreshold(audioSettings.voiceActivitySensitivity);

                const now = performance.now();
                const active = level >= thr;
                const releaseMs = 150;
                if (active) {
                    this.vadActive = true;
                    this.vadLastVoiceTs = now;
                } else if (this.vadActive && (now - this.vadLastVoiceTs) < releaseMs) {
                    this.vadActive = true;
                } else {
                    this.vadActive = false;
                }

                // If VAD controls mic (voice-activity and not PTT), re-evaluate gating
                if (!this.pttMode && audioSettings.inputMode === 'voice-activity') {
                    this.updateTrackEnabled();
                }

                this.vadRaf = requestAnimationFrame(loop);
            };
            this.vadRaf = requestAnimationFrame(loop);
        } catch {
            // Ignore VAD setup errors
        }
    }

    private stopVadMonitoring() {
        if (this.vadRaf) { cancelAnimationFrame(this.vadRaf); this.vadRaf = null; }
        try { this.vadSource?.disconnect(); } catch {}
        try { this.vadAnalyser?.disconnect(); } catch {}
        this.vadSource = null;
        this.vadAnalyser = null;
        if (this.audioCtx) { try { this.audioCtx.close(); } catch {}; this.audioCtx = null; }
        this.vadActive = false;
        this.vadLastVoiceTs = 0;
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
        this.voiceConnectedAt = Date.now();
        await this.ensureLocalStream();
        this.updateTrackEnabled();
    }

    leaveChannel() {
        this.isInVoiceChannel = false;
        this.voiceConnectedAt = null;
        this.statsPrev.clear();
        
        for (const id of Array.from(this.peers.keys())) {
            this.removeUser(id);
        }
        if (this.localStream) { try { this.localStream.getTracks().forEach(track => track.stop()); } catch {}; this.localStream = null; }
        if (this.vadInputStream) { try { this.vadInputStream.getTracks().forEach(track => track.stop()); } catch {}; this.vadInputStream = null; }
        this.stopVadMonitoring();
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
        if (this.localStream) { try { this.localStream.getTracks().forEach(track => track.stop()); } catch {}; this.localStream = null; }
        if (this.vadInputStream) { try { this.vadInputStream.getTracks().forEach(track => track.stop()); } catch {}; this.vadInputStream = null; }
        this.stopVadMonitoring();
        
        // Clean up settings listener
        if (this.settingsCleanup) {
            this.settingsCleanup();
            this.settingsCleanup = null;
        }
    }

    // Returns the timestamp when voice chat was entered, or null
    getVoiceConnectedAt(): number | null {
        return this.voiceConnectedAt;
    }

    // Aggregate audio stats across all peer connections
    // Returns inbound/outbound bitrate in kbps, avg RTT ms, packet loss percent
    async getAggregatedAudioStats(): Promise<{ inboundKbps: number; outboundKbps: number; latencyMs: number; packetLossPct: number; }> {
        let totalInboundBytesDelta = 0;
        let totalOutboundBytesDelta = 0;
        let totalPacketsDelta = 0;
        let totalPacketsLostDelta = 0;
        let rttSum = 0;
        let rttCount = 0;

        const now = Date.now();

        const perPeerPromises: Promise<void>[] = [];
        this.peers.forEach((peer: any, connectionId: string) => {
            const pc: RTCPeerConnection | undefined = peer?._pc;
            if (!pc) return;
            perPeerPromises.push(pc.getStats().then((report: RTCStatsReport) => {
                let inboundBytes = 0;
                let outboundBytes = 0;
                let inboundPackets = 0;
                let inboundPacketsLost = 0;
                let rttMs: number | undefined;

                report.forEach((stat: any) => {
                    if ((stat.type === 'inbound-rtp' || stat.type === 'remote-outbound-rtp') && stat.kind === 'audio') {
                        // inbound audio (received)
                        if (typeof stat.bytesReceived === 'number') inboundBytes += stat.bytesReceived;
                        if (typeof stat.packetsReceived === 'number') inboundPackets += stat.packetsReceived;
                        if (typeof stat.packetsLost === 'number') inboundPacketsLost += stat.packetsLost;
                        if (typeof stat.roundTripTime === 'number') {
                            // remote-outbound-rtp exposes RTT in seconds
                            rttMs = Math.max(0, (stat.roundTripTime as number) * 1000);
                        }
                    }
                    if ((stat.type === 'outbound-rtp' || stat.type === 'remote-inbound-rtp') && stat.kind === 'audio') {
                        // outbound audio (sent)
                        if (typeof stat.bytesSent === 'number') outboundBytes += stat.bytesSent;
                        if (typeof stat.roundTripTime === 'number') {
                            rttMs = Math.max(0, (stat.roundTripTime as number) * 1000);
                        }
                    }
                    if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated && typeof stat.currentRoundTripTime === 'number') {
                        rttMs = Math.max(0, stat.currentRoundTripTime * 1000);
                    }
                });

                const prev = this.statsPrev.get(connectionId);
                if (prev) {
                    const dtSec = Math.max(0.001, (now - prev.ts) / 1000);
                    const inDelta = Math.max(0, inboundBytes - prev.inboundBytes);
                    const outDelta = Math.max(0, outboundBytes - prev.outboundBytes);
                    totalInboundBytesDelta += inDelta / dtSec;
                    totalOutboundBytesDelta += outDelta / dtSec;
                    const pktDelta = Math.max(0, inboundPackets - prev.inboundPackets);
                    const lostDelta = Math.max(0, inboundPacketsLost - prev.inboundPacketsLost);
                    totalPacketsDelta += pktDelta + lostDelta; // total = received + lost
                    totalPacketsLostDelta += lostDelta;
                }

                this.statsPrev.set(connectionId, {
                    inboundBytes,
                    outboundBytes,
                    inboundPackets,
                    inboundPacketsLost,
                    ts: now,
                    rttMs,
                });

                if (typeof rttMs === 'number') {
                    rttSum += rttMs;
                    rttCount += 1;
                }
            }).catch(() => { /* ignore per-peer stats errors */ }));
        });

        await Promise.all(perPeerPromises);

        // Convert bytes/sec to kbps (8 bits per byte, /1000)
        const inboundKbps = Math.round((totalInboundBytesDelta * 8) / 1000);
        const outboundKbps = Math.round((totalOutboundBytesDelta * 8) / 1000);
        const latencyMs = rttCount > 0 ? Math.round(rttSum / rttCount) : 0;
        const packetLossPct = totalPacketsDelta > 0 ? Math.round((totalPacketsLostDelta / totalPacketsDelta) * 1000) / 10 : 0;

        return { inboundKbps, outboundKbps, latencyMs, packetLossPct };
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
        let gateOk = true;
        if (this.pttMode) {
            gateOk = this.pttActive;
        } else if (audioSettings.inputMode === 'voice-activity') {
            gateOk = this.vadActive;
        }

        const shouldEnable = !this.isMutedForTesting
            && !this.globalMuted
            && volumeOk
            && gateOk;

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
