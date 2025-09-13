import { ref, readonly } from 'vue';
import { useI18n } from 'vue-i18n';

export interface CameraQualityOption {
  value: string;
  label: string;
  width: number;
  height: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

const cameraQualityOptions: CameraQualityOption[] = [
  { value: '720p', label: '720p HD', width: 1280, height: 720 },
  { value: '1080p', label: '1080p Full HD', width: 1920, height: 1080 },
];

// Shared reactive state for camera settings across components
const cameraDevices = ref<CameraDeviceInfo[]>([]);
const selectedCameraDeviceId = ref<string | null>(null);
const selectedCameraQuality = ref<CameraQualityOption>(cameraQualityOptions[1]); // default 1080p

export function useCameraSettings() {
  const { t } = useI18n();

  const refreshCameraDevices = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      cameraDevices.value = [];
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || t('voice.panel.menu.camera') }));
      cameraDevices.value = cams;
      if (!selectedCameraDeviceId.value && cams.length > 0) {
        selectedCameraDeviceId.value = cams[0].deviceId;
      }
    } catch {
      // ignore
    }
  };

  const ensureCameraDevicesLoaded = async (): Promise<void> => {
    if (cameraDevices.value.length === 0) {
      await refreshCameraDevices();
    }
  };

  return {
    qualityOptions: readonly(cameraQualityOptions),
    devices: cameraDevices,
    selectedDeviceId: selectedCameraDeviceId,
    selectedQuality: selectedCameraQuality,
    setDevice: (id: string) => { selectedCameraDeviceId.value = id; },
    setQuality: (q: CameraQualityOption) => { selectedCameraQuality.value = q; },
    refreshDevices: refreshCameraDevices,
    ensureDevicesLoaded: ensureCameraDevicesLoaded,
    getCurrentConstraints: () => ({
      width: selectedCameraQuality.value.width,
      height: selectedCameraQuality.value.height,
      deviceId: selectedCameraDeviceId.value || undefined,
    })
  };
}
