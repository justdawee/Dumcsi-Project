import { ref, readonly } from 'vue';

export interface QualityOption {
  value: string;
  label: string;
  resolution: string;
  width: number;
  height: number;
}

export interface FPSOption {
  value: number;
  label: string;
  description: string;
}

// Shared state for screen share and camera quality settings
const resolutionOptions: QualityOption[] = [
  { value: '4k', label: '4K Ultra', resolution: '3840×2160', width: 3840, height: 2160 },
  { value: '1080p', label: '1080p HD', resolution: '1920×1080', width: 1920, height: 1080 },
  { value: '720p', label: '720p', resolution: '1280×720', width: 1280, height: 720 },
  { value: '480p', label: '480p', resolution: '854×480', width: 854, height: 480 },
];

const fpsOptions: FPSOption[] = [
  { value: 15, label: '15 FPS', description: 'Low motion (saves bandwidth)' },
  { value: 30, label: '30 FPS', description: 'Standard (recommended)' },
  { value: 60, label: '60 FPS', description: 'Smooth motion (higher bandwidth)' },
];

// Shared reactive state
const selectedQuality = ref<QualityOption>(resolutionOptions[1]); // Default to 1080p
const selectedFPS = ref<number>(30);
const includeAudio = ref<boolean>(true); // Default to true as requested

export function useScreenShareSettings() {
  return {
    // Static options
    resolutionOptions: readonly(resolutionOptions),
    fpsOptions: readonly(fpsOptions),
    
    // Reactive state
    selectedQuality,
    selectedFPS,
    includeAudio,
    
    // Computed values
    getCurrentSettings: () => ({
      width: selectedQuality.value.width,
      height: selectedQuality.value.height,
      frameRate: selectedFPS.value,
      includeAudio: includeAudio.value,
    }),
    
    // Actions
    setQuality: (quality: QualityOption) => {
      selectedQuality.value = quality;
    },
    
    setFPS: (fps: number) => {
      selectedFPS.value = fps;
    },
    
    setIncludeAudio: (include: boolean) => {
      includeAudio.value = include;
    },
  };
}