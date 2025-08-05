import { ref, reactive, watch } from 'vue';

export interface AudioSettings {
  inputDevice: string;
  outputDevice: string;
  inputVolume: number;
  outputVolume: number;
  inputMode: 'voice-activity' | 'push-to-talk';
  voiceActivitySensitivity: number;
  pushToTalkKey: string;
  pushToTalkDelay: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

// Global reactive settings
const audioSettings = reactive<AudioSettings>({
  inputDevice: 'default',
  outputDevice: 'default',
  inputVolume: 75,
  outputVolume: 100,
  inputMode: 'voice-activity',
  voiceActivitySensitivity: 50,
  pushToTalkKey: '',
  pushToTalkDelay: 200,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true
});

// Available audio devices
const inputDevices = ref<MediaDeviceInfo[]>([]);
const outputDevices = ref<MediaDeviceInfo[]>([]);

// Settings change listeners
const settingsChangeListeners = new Set<(settings: AudioSettings) => void>();

// Load settings from localStorage
const loadSettings = () => {
  const saved = localStorage.getItem('audio-settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(audioSettings, parsed);
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
  }
};

// Save settings to localStorage
const saveSettings = () => {
  localStorage.setItem('audio-settings', JSON.stringify(audioSettings));
};

// Watch for changes and save
watch(audioSettings, () => {
  saveSettings();
  // Notify all listeners
  settingsChangeListeners.forEach(listener => listener(audioSettings));
}, { deep: true });

// Get available audio devices
const getAudioDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    inputDevices.value = devices.filter(device => device.kind === 'audioinput');
    outputDevices.value = devices.filter(device => device.kind === 'audiooutput');
    
    // Request microphone permissions to get device labels if not already granted
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      // Refresh device list after getting permissions
      const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
      inputDevices.value = devicesWithLabels.filter(device => device.kind === 'audioinput');
      outputDevices.value = devicesWithLabels.filter(device => device.kind === 'audiooutput');
    } catch (error) {
      console.warn('Microphone permission not granted, device labels may be limited');
    }
  } catch (error) {
    console.error('Error getting audio devices:', error);
  }
};

export const useAudioSettings = () => {
  // Initialize on first use
  if (inputDevices.value.length === 0) {
    loadSettings();
    getAudioDevices();
  }

  const onSettingsChange = (callback: (settings: AudioSettings) => void) => {
    settingsChangeListeners.add(callback);
    
    // Return cleanup function
    return () => {
      settingsChangeListeners.delete(callback);
    };
  };

  return {
    audioSettings,
    inputDevices,
    outputDevices,
    getAudioDevices,
    onSettingsChange,
    loadSettings,
    saveSettings
  };
};