import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { VoiceSettings } from '@/types/keybinds';

const defaultVoiceSettings: VoiceSettings = {
  inputMode: 'voiceActivity',
  pushToTalkKey: 'Space',
  pushToTalkReleaseDelay: 20, // 20ms default delay
  inputSensitivity: 50,
  outputVolume: 100,
  inputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true
};

const voiceSettings = ref<VoiceSettings>({ ...defaultVoiceSettings });
const isPushToTalkActive = ref(false);
const isRecordingPTTKey = ref(false);
const pttReleaseTimeout = ref<number | null>(null);

export function useVoiceSettings() {
  // Load settings from localStorage
  const loadVoiceSettings = (): VoiceSettings => {
    try {
      const stored = localStorage.getItem('dumcsi-voice-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultVoiceSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load voice settings:', error);
    }
    return { ...defaultVoiceSettings };
  };

  // Save settings to localStorage
  const saveVoiceSettings = (settings: VoiceSettings) => {
    try {
      localStorage.setItem('dumcsi-voice-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save voice settings:', error);
    }
  };

  // Update voice settings
  const updateVoiceSettings = (updates: Partial<VoiceSettings>) => {
    voiceSettings.value = { ...voiceSettings.value, ...updates };
    saveVoiceSettings(voiceSettings.value);
  };

  // Reset to defaults
  const resetVoiceSettings = () => {
    voiceSettings.value = { ...defaultVoiceSettings };
    saveVoiceSettings(voiceSettings.value);
  };

  // Check if key matches push-to-talk key
  const matchesPTTKey = (event: KeyboardEvent): boolean => {
    const pttKey = voiceSettings.value.pushToTalkKey.toLowerCase();
    
    // Handle special cases
    if (pttKey === 'space' && event.code === 'Space') return true;
    if (pttKey === 'enter' && (event.code === 'Enter' || event.code === 'NumpadEnter')) return true;
    
    // Handle modifier combinations
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    
    const eventKey = event.key.toLowerCase();
    const eventCode = event.code.toLowerCase();
    
    // Check if it's a simple key match
    if (modifiers.length === 0 && (eventKey === pttKey || eventCode === pttKey)) {
      return true;
    }
    
    // Check if it's a combination match
    const combination = [...modifiers, eventKey].join('+');
    const combinationCode = [...modifiers, eventCode].join('+');
    
    return combination === pttKey || combinationCode === pttKey;
  };

  // Format key from keyboard event for PTT
  const formatPTTKeyFromEvent = (event: KeyboardEvent): string => {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Meta');

    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (key === 'Enter') key = 'Enter';
    else if (key.length === 1) key = key.toUpperCase();
    else if (event.code.startsWith('Key')) key = event.code.slice(3);

    if (modifiers.length === 0) {
      return key;
    }
    
    return [...modifiers, key].join('+');
  };

  // Handle push-to-talk keydown
  const handlePTTKeyDown = (event: KeyboardEvent) => {
    if (voiceSettings.value.inputMode !== 'pushToTalk') return;
    
    // Skip if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (matchesPTTKey(event)) {
      event.preventDefault();
      
      if (!isPushToTalkActive.value) {
        isPushToTalkActive.value = true;
        
        // Clear any existing release timeout
        if (pttReleaseTimeout.value) {
          clearTimeout(pttReleaseTimeout.value);
          pttReleaseTimeout.value = null;
        }
        
        // Activate microphone via WebRTC service
        console.log('🎤 Push-to-talk activated');
        try {
          // Dynamic import to avoid circular dependencies
          import('@/services/webrtcService').then(({ webrtcService }) => {
            webrtcService.setMuted(false);
          });
        } catch (error) {
          console.warn('Failed to unmute via WebRTC service:', error);
        }
      }
    }
  };

  // Handle push-to-talk keyup
  const handlePTTKeyUp = (event: KeyboardEvent) => {
    if (voiceSettings.value.inputMode !== 'pushToTalk') return;
    
    if (matchesPTTKey(event)) {
      event.preventDefault();
      
      // Schedule deactivation with delay
      if (pttReleaseTimeout.value) {
        clearTimeout(pttReleaseTimeout.value);
      }
      
      pttReleaseTimeout.value = window.setTimeout(() => {
        isPushToTalkActive.value = false;
        console.log('🎤 Push-to-talk deactivated');
        
        // Mute microphone via WebRTC service
        try {
          import('@/services/webrtcService').then(({ webrtcService }) => {
            webrtcService.setMuted(true);
          });
        } catch (error) {
          console.warn('Failed to mute via WebRTC service:', error);
        }
        
        pttReleaseTimeout.value = null;
      }, voiceSettings.value.pushToTalkReleaseDelay);
    }
  };

  // Record new PTT key
  const recordPTTKey = (): Promise<string> => {
    return new Promise((resolve) => {
      isRecordingPTTKey.value = true;
      
      const handleKeyDown = (event: KeyboardEvent) => {
        event.preventDefault();
        const key = formatPTTKeyFromEvent(event);
        
        document.removeEventListener('keydown', handleKeyDown);
        isRecordingPTTKey.value = false;
        
        resolve(key);
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Auto-cancel after 10 seconds
      setTimeout(() => {
        if (isRecordingPTTKey.value) {
          document.removeEventListener('keydown', handleKeyDown);
          isRecordingPTTKey.value = false;
          resolve(voiceSettings.value.pushToTalkKey); // Return current key
        }
      }, 10000);
    });
  };

  // Initialize voice settings and PTT listeners
  const initializeVoiceSettings = () => {
    voiceSettings.value = loadVoiceSettings();
    
    // Add PTT listeners
    document.addEventListener('keydown', handlePTTKeyDown);
    document.addEventListener('keyup', handlePTTKeyUp);
  };

  // Cleanup PTT listeners
  const cleanupVoiceSettings = () => {
    document.removeEventListener('keydown', handlePTTKeyDown);
    document.removeEventListener('keyup', handlePTTKeyUp);
    
    if (pttReleaseTimeout.value) {
      clearTimeout(pttReleaseTimeout.value);
      pttReleaseTimeout.value = null;
    }
  };

  // Watch for input mode changes to reset PTT state
  watch(() => voiceSettings.value.inputMode, (newMode) => {
    if (newMode !== 'pushToTalk') {
      isPushToTalkActive.value = false;
      if (pttReleaseTimeout.value) {
        clearTimeout(pttReleaseTimeout.value);
        pttReleaseTimeout.value = null;
      }
    }
  });

  onMounted(() => {
    initializeVoiceSettings();
  });

  onUnmounted(() => {
    cleanupVoiceSettings();
  });

  return {
    voiceSettings: computed(() => voiceSettings.value),
    isPushToTalkActive: computed(() => isPushToTalkActive.value),
    isRecordingPTTKey: computed(() => isRecordingPTTKey.value),
    updateVoiceSettings,
    resetVoiceSettings,
    recordPTTKey,
    formatPTTKeyFromEvent
  };
}