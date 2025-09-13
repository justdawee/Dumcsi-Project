<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <MicIcon class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.voice.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.voice.subtitle') }}</p>
        </div>
      </header>

      <!-- Input Device Settings -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden mb-8">
        <div class="p-6 border-b border-border-default">
          <h2 class="text-lg font-semibold leading-6 flex items-center">
            <MicIcon class="w-5 h-5 mr-3 text-primary"/>
            {{ t('settings.voice.input.title') }}
          </h2>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.voice.input.description') }}</p>
        </div>
        <div class="p-6 space-y-6">
          <!-- Input Device Selection -->
          <div class="max-w-md">
            <label class="form-label">{{ t('settings.voice.microphone.device') }}</label>
            <select v-model="audioSettings.inputDevice" class="form-input">
              <option value="default">{{ t('settings.voice.defaultDevice') }}</option>
              <option v-for="device in inputDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label || `Microphone ${device.deviceId.slice(0, 8)}` }}
              </option>
            </select>
          </div>

          <!-- Input Volume -->
          <div class="max-w-md">
            <label class="form-label">{{ t('settings.voice.inputVolume') }}</label>
            <div class="flex items-center space-x-4">
              <Volume2 class="w-4 h-4 text-text-muted"/>
              <input 
                v-model="audioSettings.inputVolume" 
                type="range" 
                min="0" 
                max="100" 
                class="flex-1 slider"
                @input="updateInputVolume"
              />
              <span class="text-sm font-medium min-w-[3rem] text-right">{{ audioSettings.inputVolume }}%</span>
            </div>
            <!-- Volume Meter -->
            <div class="mt-3 w-full bg-bg-base rounded-full h-3 overflow-hidden border border-border-default">
              <div 
                class="h-full transition-all duration-100 ease-out"
                :class="[
                  inputLevel < 0.3 ? 'bg-green-500' :
                  inputLevel < 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                ]"
                :style="{ 
                  width: `${Math.min(inputLevel * 100, 100)}%`,
                  transition: inputLevel > (inputLevel * 0.8) ? 'width 0.05s ease-out' : 'width 0.2s ease-out'
                }"
              ></div>
            </div>
            <!-- Volume Level Indicator -->
            <div class="mt-2 flex justify-between text-xs text-text-muted">
              <span>Quiet</span>
              <span class="font-medium" :class="inputLevel > 0.8 ? 'text-red-500' : 'text-text-default'">
                {{ (inputLevel * 100).toFixed(0) }}%
              </span>
              <span>Loud</span>
            </div>
          </div>

          <!-- Mic Test Button -->
          <div class="max-w-md">
            <button 
              @click="toggleMicTest"
              :class="[
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors',
                isTesting 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-primary text-primary-text hover:bg-primary/90'
              ]"
            >
              <component :is="isTesting ? Square : Play" class="w-4 h-4 mr-2"/>
              {{ isTesting ? t('settings.voice.microphone.stopTest') : t('settings.voice.microphone.test') }}
            </button>
            <p class="mt-2 text-sm text-text-muted">
              {{ isTesting ? t('settings.voice.microphone.testHintActive') : t('settings.voice.microphone.testHint') }}
            </p>
            <div v-if="isTesting" class="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div class="flex items-center">
                <div class="w-4 h-4 rounded-full bg-yellow-500 mr-2 flex-shrink-0"></div>
                <p class="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Tip:</strong> Use headphones to prevent audio feedback. Adjust input volume slider to control playback level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Output Device Settings -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden mb-8">
        <div class="p-6 border-b border-border-default">
          <h2 class="text-lg font-semibold leading-6 flex items-center">
            <Headphones class="w-5 h-5 mr-3 text-primary"/>
            {{ t('settings.voice.output.title') }}
          </h2>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.voice.output.description') }}</p>
        </div>
        <div class="p-6 space-y-6">
          <!-- Output Device Selection -->
          <div class="max-w-md">
            <label class="form-label">{{ t('settings.voice.output.device') }}</label>
            <select v-model="audioSettings.outputDevice" class="form-input">
              <option value="default">{{ t('settings.voice.defaultDevice') }}</option>
              <option v-for="device in outputDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label || `Audio Output ${device.deviceId.slice(0, 8)}` }}
              </option>
            </select>
          </div>

          <!-- Output Volume -->
          <div class="max-w-md">
            <label class="form-label">{{ t('settings.voice.outputVolume') }}</label>
            <div class="flex items-center space-x-4">
              <VolumeX class="w-4 h-4 text-text-muted"/>
              <input 
                v-model="audioSettings.outputVolume" 
                type="range" 
                min="0" 
                max="100" 
                class="flex-1 slider"
                @input="updateOutputVolume"
              />
              <span class="text-sm font-medium min-w-[3rem] text-right">{{ audioSettings.outputVolume }}%</span>
            </div>
          </div>

          <!-- Test Sound Button -->
          <div class="max-w-md">
            <button 
              @click="playTestSound"
              :disabled="playingTestSound"
              class="flex items-center px-4 py-2 bg-primary text-primary-text rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <component :is="playingTestSound ? Loader2 : Volume2" :class="['w-4 h-4 mr-2', { 'animate-spin': playingTestSound }]"/>
              {{ playingTestSound ? 'Playing...' : 'Test Audio' }}
            </button>
            <p class="mt-2 text-sm text-text-muted">Play a test sound to check your audio output</p>
          </div>
        </div>
      </div>

      <!-- Input Mode Settings -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden mb-8">
        <div class="p-6 border-b border-border-default">
          <h2 class="text-lg font-semibold leading-6 flex items-center">
            <Settings class="w-5 h-5 mr-3 text-primary"/>
            Input Mode
          </h2>
          <p class="mt-1 text-sm text-text-muted">Choose how your microphone activates</p>
        </div>
        <div class="p-6 space-y-6">
          <!-- Input Mode Selection -->
          <div class="space-y-4">
            <!-- Voice Activity -->
            <label class="flex items-start space-x-3 cursor-pointer group">
              <input 
                v-model="audioSettings.inputMode" 
                type="radio" 
                value="voice-activity" 
                class="mt-0.5 radio"
              />
              <div class="flex-1">
                <div class="font-medium group-hover:text-primary transition-colors">Voice Activity</div>
                <p class="text-sm text-text-muted mt-1">Automatically activates when you speak (recommended)</p>
              </div>
            </label>

            <!-- Push to Talk -->
            <label class="flex items-start space-x-3 cursor-pointer group">
              <input 
                v-model="audioSettings.inputMode" 
                type="radio" 
                value="push-to-talk" 
                class="mt-0.5 radio"
              />
              <div class="flex-1">
                <div class="font-medium group-hover:text-primary transition-colors">Push to Talk</div>
                <p class="text-sm text-text-muted mt-1">Hold a key to transmit audio</p>
              </div>
            </label>
          </div>

          <!-- Voice Activity Settings -->
          <div v-if="audioSettings.inputMode === 'voice-activity'" class="pl-6 border-l-2 border-primary/30 space-y-4">
            <div class="max-w-md">
              <label class="form-label">Voice Activity Sensitivity</label>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-text-muted">Low</span>
                <input 
                  v-model="audioSettings.voiceActivitySensitivity" 
                  type="range" 
                  min="0" 
                  max="100" 
                  class="flex-1 slider"
                />
                <span class="text-sm text-text-muted">High</span>
              </div>
              <p class="mt-2 text-sm text-text-muted">
                Adjust how sensitive voice detection is. Higher values activate with quieter sounds.
              </p>

              <!-- Voice Activity Meter with Threshold Indicator -->
              <div class="mt-4">
                <div class="flex justify-between text-xs text-text-muted mb-1">
                  <span>Silence</span>
                  <span>Threshold: {{ Math.round(vadThreshold * 100) }}%</span>
                </div>
                <div class="relative w-full h-3 bg-bg-base rounded-full overflow-hidden border border-border-default">
                  <!-- Current level fill -->
                  <div 
                    class="h-full transition-[width] duration-75 ease-out"
                    :class="isAboveThreshold ? 'bg-green-500' : 'bg-yellow-500'"
                    :style="{ width: `${Math.min(inputLevel * 100, 100)}%` }"
                  />
                  <!-- Threshold Marker -->
                  <div 
                    class="absolute top-0 bottom-0 w-[2px] bg-red-500/80"
                    :style="{ left: `calc(${Math.min(vadThreshold * 100, 100)}% - 1px)` }"
                  />
                </div>
                <div class="mt-2 text-xs" :class="isAboveThreshold ? 'text-green-600 dark:text-green-400' : 'text-text-muted'">
                  {{ isAboveThreshold ? 'Detected (above threshold)' : 'Not detected' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Push to Talk Settings -->
          <div v-if="audioSettings.inputMode === 'push-to-talk'" class="pl-6 border-l-2 border-primary/30 space-y-4">
            <!-- Push to Talk Key -->
            <div class="max-w-md">
              <label class="form-label">Push to Talk Key</label>
              <button 
                @click="startPTTKeyCapture"
                :class="[
                  'w-full px-4 py-3 rounded-lg border transition-colors',
                  isRecordingPTTKey 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border-default bg-bg-base hover:bg-bg-hover'
                ]"
              >
                {{ isRecordingPTTKey ? 'Press a key...' : (voiceSettings.pushToTalkKey || 'Click to set key') }}
              </button>
              <p class="mt-2 text-sm text-text-muted">
                {{ isRecordingPTTKey ? 'Press any key to set as your push-to-talk key' : 'Current push-to-talk key binding' }}
              </p>
              <div v-if="isPushToTalkActive" class="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div class="flex items-center">
                  <div class="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                  <span class="text-sm text-green-600 dark:text-green-400 font-medium">Push-to-talk is active</span>
                </div>
              </div>
            </div>

            <!-- Push to Talk Delay -->
            <div class="max-w-md">
              <label class="form-label">Release Delay</label>
              <div class="flex items-center space-x-4">
                <input 
                  v-model="voiceSettings.pushToTalkReleaseDelay" 
                  type="range" 
                  min="0" 
                  max="2000" 
                  step="20"
                  class="flex-1 slider"
                  @input="updateReleaseDelay"
                />
                <span class="text-sm font-medium min-w-[4rem] text-right">{{ voiceSettings.pushToTalkReleaseDelay }}ms</span>
              </div>
              <p class="mt-2 text-sm text-text-muted">
                How long to continue transmitting after releasing the push-to-talk key
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden">
        <div class="p-6 border-b border-border-default">
          <h2 class="text-lg font-semibold leading-6 flex items-center">
            <Sliders class="w-5 h-5 mr-3 text-primary"/>
            Advanced
          </h2>
          <p class="mt-1 text-sm text-text-muted">Additional audio processing options</p>
        </div>
        <div class="p-6 space-y-6">
          <!-- Noise Suppression -->
          <label class="flex items-center justify-between cursor-pointer group">
            <div>
              <div class="font-medium group-hover:text-primary transition-colors">Noise Suppression</div>
              <p class="text-sm text-text-muted mt-1">Reduce background noise from your microphone</p>
            </div>
            <input 
              v-model="audioSettings.noiseSuppression" 
              type="checkbox" 
              class="toggle"
            />
          </label>

          <!-- Echo Cancellation -->
          <label class="flex items-center justify-between cursor-pointer group">
            <div>
              <div class="font-medium group-hover:text-primary transition-colors">Echo Cancellation</div>
              <p class="text-sm text-text-muted mt-1">Prevent your speakers from being picked up by your microphone</p>
            </div>
            <input 
              v-model="audioSettings.echoCancellation" 
              type="checkbox" 
              class="toggle"
            />
          </label>

          <!-- Auto Gain Control -->
          <label class="flex items-center justify-between cursor-pointer group">
            <div>
              <div class="font-medium group-hover:text-primary transition-colors">Automatic Gain Control</div>
              <p class="text-sm text-text-muted mt-1">Automatically adjust microphone sensitivity</p>
            </div>
            <input 
              v-model="audioSettings.autoGainControl" 
              type="checkbox" 
              class="toggle"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { 
  Mic as MicIcon, 
  Headphones, 
  Volume2, 
  VolumeX, 
  Settings, 
  Sliders,
  Play,
  Square,
  Loader2
} from 'lucide-vue-next';
import { useAudioSettings } from '@/composables/useAudioSettings';
import { useVoiceSettings } from '@/composables/useVoiceSettings';
import { webrtcService } from '@/services/webrtcService';
import { useI18n } from 'vue-i18n';

// Use shared audio settings
const { audioSettings, inputDevices, outputDevices, getAudioDevices } = useAudioSettings();
const { t } = useI18n();

// Use voice settings for push-to-talk
const { 
  voiceSettings, 
  isPushToTalkActive, 
  isRecordingPTTKey, 
  updateVoiceSettings,
  recordPTTKey 
} = useVoiceSettings();

// Audio state
const inputLevel = ref(0);
const isTesting = ref(false);
const playingTestSound = ref(false);

// Audio contexts
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let gainNode: GainNode | null = null;
let stream: MediaStream | null = null;
let animationFrame: number | null = null;

// Passive input-level monitor (no playback), for always-on meter
let passiveCtx: AudioContext | null = null;
let passiveAnalyser: AnalyserNode | null = null;
let passiveSource: MediaStreamAudioSourceNode | null = null;
let passiveStream: MediaStream | null = null;
let passiveRaf: number | null = null;

// VAD threshold mapping (must match WebRTC service)
const getVadThreshold = (sensitivity: number) => {
  const n = Math.min(100, Math.max(0, sensitivity)) / 100;
  const minThr = 0.02; // more sensitive at highest sensitivity
  const maxThr = 0.6;
  return maxThr - n * (maxThr - minThr);
};

const vadThreshold = computed(() => getVadThreshold(audioSettings.voiceActivitySensitivity));
const isAboveThreshold = computed(() => inputLevel.value >= vadThreshold.value);

// Auto-mute WebRTC during microphone testing
const setWebRtcMuteDuringTest = (muted: boolean) => {
  webrtcService.setMutedForTesting(muted);
};

// Update input volume
const updateInputVolume = () => {
  // Adjust gain in real-time if testing
  if (gainNode && audioContext && isTesting.value) {
    gainNode.gain.setValueAtTime(audioSettings.inputVolume / 100, audioContext.currentTime);
  }
  
};

// Update output volume
const updateOutputVolume = () => {
  // In a real implementation, this would adjust audio output volume
  
};

// Microphone test functionality
const toggleMicTest = async () => {
  if (isTesting.value) {
    stopMicTest();
  } else {
    // Avoid double capture; stop passive monitor while testing
    stopPassiveMonitor();
    await startMicTest();
  }
};

const startMicTest = async () => {
  try {
    isTesting.value = true;
    
    // Mute in WebRTC voice channel during testing
    setWebRtcMuteDuringTest(true);
    
    // Get user media
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: audioSettings.inputDevice !== 'default' ? audioSettings.inputDevice : undefined,
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: audioSettings.autoGainControl
      }
    });

    // Create audio context and analyser
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    gainNode = audioContext.createGain();
    microphone = audioContext.createMediaStreamSource(stream);
    
    // Configure analyser for accurate volume detection
    analyser.fftSize = 2048; // Higher resolution for better accuracy
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    
    // Set up audio routing for playback and analysis
    // Microphone -> Gain Node -> Analyser and Audio Output
    microphone.connect(gainNode);
    gainNode.connect(analyser);
    gainNode.connect(audioContext.destination); // This enables hearing yourself
    
    // Set initial gain based on input volume setting
    gainNode.gain.setValueAtTime(audioSettings.inputVolume / 100, audioContext.currentTime);

    // Start monitoring audio levels
    monitorAudioLevel();
  } catch (error) {
    console.error('Error starting microphone test:', error);
    isTesting.value = false;
  }
};

const stopMicTest = () => {
  isTesting.value = false;
  inputLevel.value = 0;
  
  // Unmute in WebRTC voice channel
  setWebRtcMuteDuringTest(false);
  
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  analyser = null;
  microphone = null;
  gainNode = null;

  // Resume passive monitor after testing
  startPassiveMonitor();
};

const monitorAudioLevel = () => {
  if (!analyser || !isTesting.value) return;
  
  // Use time domain data for accurate volume measurement
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
  
  // Calculate RMS (Root Mean Square) for accurate volume
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    const sample = (dataArray[i] - 128) / 128; // Convert to -1 to 1 range
    sum += sample * sample;
  }
  
  const rms = Math.sqrt(sum / bufferLength);
  
  // Apply logarithmic scaling and amplification for better sensitivity
  const volume = Math.min(1, rms * 8); // Amplify by 8x for better response
  
  // Smooth the volume changes for better visual experience
  const smoothingFactor = 0.8;
  inputLevel.value = inputLevel.value * smoothingFactor + volume * (1 - smoothingFactor);
  
  animationFrame = requestAnimationFrame(monitorAudioLevel);
};

// Start passive monitor for the meter (no playback)
const startPassiveMonitor = async () => {
  if (isTesting.value) return; // test mode owns the meter when active
  try {
    // If already running, restart with current constraints
    stopPassiveMonitor();

    passiveStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: audioSettings.inputDevice !== 'default' ? audioSettings.inputDevice : undefined,
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: audioSettings.autoGainControl
      }
    });

    passiveCtx = new AudioContext();
    passiveAnalyser = passiveCtx.createAnalyser();
    passiveAnalyser.fftSize = 2048;
    passiveAnalyser.minDecibels = -90;
    passiveAnalyser.maxDecibels = -10;
    passiveAnalyser.smoothingTimeConstant = 0.85;

    passiveSource = passiveCtx.createMediaStreamSource(passiveStream);
    passiveSource.connect(passiveAnalyser);

    const loop = () => {
      if (!passiveAnalyser || isTesting.value) return; // stop updating if test started
      const bufferLength = passiveAnalyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      passiveAnalyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const sample = (dataArray[i] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volume = Math.min(1, rms * 8);
      const smoothingFactor = 0.8;
      inputLevel.value = inputLevel.value * smoothingFactor + volume * (1 - smoothingFactor);
      passiveRaf = requestAnimationFrame(loop);
    };
    passiveRaf = requestAnimationFrame(loop);
  } catch (e) {
    // Silently ignore permission errors; meter will stay idle
  }
};

const stopPassiveMonitor = () => {
  if (passiveRaf) { cancelAnimationFrame(passiveRaf); passiveRaf = null; }
  if (passiveStream) { try { passiveStream.getTracks().forEach(t => t.stop()); } catch {} passiveStream = null; }
  try { passiveSource?.disconnect(); } catch {}
  try { passiveAnalyser?.disconnect(); } catch {}
  passiveSource = null;
  passiveAnalyser = null;
  if (passiveCtx) { try { passiveCtx.close(); } catch {} passiveCtx = null; }
};

// Test audio output
const playTestSound = async () => {
  if (playingTestSound.value) return;
  
  try {
    playingTestSound.value = true;
    
    // Create a simple test tone
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.1 * (audioSettings.outputVolume / 100), audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5); // Play for 0.5 seconds
    
    setTimeout(() => {
      playingTestSound.value = false;
      audioContext.close();
    }, 500);
  } catch (error) {
    console.error('Error playing test sound:', error);
    playingTestSound.value = false;
  }
};

// PTT key capture using voice settings
const startPTTKeyCapture = async () => {
  try {
    const newKey = await recordPTTKey();
    updateVoiceSettings({ pushToTalkKey: newKey });
  } catch (error) {
    console.error('Failed to capture PTT key:', error);
  }
};

// Update release delay
const updateReleaseDelay = () => {
  updateVoiceSettings({ 
    pushToTalkReleaseDelay: voiceSettings.value.pushToTalkReleaseDelay 
  });
};

// Sync audio settings input mode with voice settings
watch(() => audioSettings.inputMode, (newMode) => {
  const voiceMode = newMode === 'push-to-talk' ? 'pushToTalk' : 'voiceActivity';
  updateVoiceSettings({ inputMode: voiceMode });
});

// Sync voice settings back to audio settings
watch(() => voiceSettings.value.inputMode, (newMode) => {
  const audioMode = newMode === 'pushToTalk' ? 'push-to-talk' : 'voice-activity';
  if (audioSettings.inputMode !== audioMode) {
    audioSettings.inputMode = audioMode;
  }
});

// Restart passive monitor when relevant input settings change (if not testing)
watch(
  () => [
    audioSettings.inputDevice,
    audioSettings.echoCancellation,
    audioSettings.noiseSuppression,
    audioSettings.autoGainControl
  ],
  () => {
    if (!isTesting.value) startPassiveMonitor();
  }
);

// Lifecycle
onMounted(() => {
  getAudioDevices();
  // Start passive monitor so the meter reflects real mic levels
  startPassiveMonitor();
});

onUnmounted(() => {
  stopMicTest();
  stopPassiveMonitor();
});
</script>

<style scoped>
@reference "@/style.css";

.slider {
  @apply appearance-none bg-bg-base rounded-lg h-2 outline-none;
}

.slider::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 bg-primary rounded-full cursor-pointer;
}

.slider::-moz-range-thumb {
  @apply w-4 h-4 bg-primary rounded-full cursor-pointer border-0;
}

.radio {
  @apply w-4 h-4 text-primary border-border-default focus:ring-primary focus:ring-2;
}

.toggle {
  @apply appearance-none w-12 h-6 bg-bg-base rounded-full relative cursor-pointer transition-colors border-0 outline-none;
  @apply checked:bg-primary;
}

.toggle::after {
  content: '';
  @apply absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm;
}

.toggle:checked::after {
  @apply translate-x-6;
}

.toggle:focus {
  @apply ring-2 ring-primary ring-offset-2 ring-offset-bg-base;
}
</style>
