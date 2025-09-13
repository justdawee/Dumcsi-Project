import { ref, readonly } from 'vue';
import { useI18n } from 'vue-i18n';

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
// Note: labels are resolved in-function via i18n for localization
const baseResolutionOptions = [
  { value: '4k', resolution: '3840×2160', width: 3840, height: 2160 },
  { value: '1080p', resolution: '1920×1080', width: 1920, height: 1080 },
  { value: '720p', resolution: '1280×720', width: 1280, height: 720 },
  { value: '480p', resolution: '854×480', width: 854, height: 480 },
] as const;

const baseFpsOptions = [
  { value: 15 },
  { value: 30 },
  { value: 60 },
] as const;

// Shared reactive state
const selectedQuality = ref<QualityOption>({ value: '1080p', label: '1080p HD', resolution: '1920×1080', width: 1920, height: 1080 }); // Default to 1080p
const selectedFPS = ref<number>(30);
const includeAudio = ref<boolean>(true); // Default to true as requested

export function useScreenShareSettings() {
  const { t } = useI18n();

  const resolutionOptions: QualityOption[] = baseResolutionOptions.map(o => ({
    value: o.value,
    label: t(`voice.quality.res.${o.value}`),
    resolution: o.resolution,
    width: o.width,
    height: o.height,
  }));

  const fpsOptions: FPSOption[] = baseFpsOptions.map(o => ({
    value: o.value,
    label: t(`voice.quality.fps.${o.value}.label`),
    description: t(`voice.quality.fps.${o.value}.description`),
  }));
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
