/**
 * Utility functions for handling browser permissions
 */
import { i18n } from '@/i18n';

export interface PermissionResult {
  granted: boolean;
  error?: string;
}

/**
 * Check if microphone permission is granted
 */
export async function checkMicrophonePermission(): Promise<PermissionResult> {
  const t = (key: string, params?: Record<string, any>) => {
    // @ts-expect-error runtime key lookup
    return i18n.global.t(key, params) as unknown as string;
  };
  try {
    // First, check if the Permissions API is available
    if ('permissions' in navigator) {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state === 'granted') {
        return { granted: true };
      } else if (permissionStatus.state === 'denied') {
        return { granted: false, error: t('voice.permissions.micro.deniedShort') };
      }
      // If state is 'prompt', we need to try to access the microphone to trigger the permission prompt
    }

    // Try to access the microphone to check/request permission
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      // If we got here, permission was granted
      // Immediately stop the stream as we were just checking permission
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true };
    } catch (error: any) {
      // Permission was denied or device not available
      const errorMessage = error.name === 'NotAllowedError' 
        ? t('voice.permissions.micro.deniedDetailed')
        : error.name === 'NotFoundError'
        ? t('voice.permissions.micro.notFound')
        : error.name === 'NotReadableError'
        ? t('voice.permissions.micro.inUse')
        : t('voice.permissions.micro.accessFailed', { error: error.message || 'Unknown error' });
      
      return { granted: false, error: errorMessage };
    }
  } catch (error: any) {
    return { 
      granted: false, 
      error: t('voice.permissions.micro.checkFailed', { error: error.message || 'Unknown error' }) 
    };
  }
}

/**
 * Request microphone permission explicitly
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  return checkMicrophonePermission();
}

/**
 * Check if camera permission is granted
 */
export async function checkCameraPermission(): Promise<PermissionResult> {
  const t = (key: string, params?: Record<string, any>) => {
    // @ts-expect-error runtime key lookup
    return i18n.global.t(key, params) as unknown as string;
  };
  try {
    // First, check if the Permissions API is available
    if ('permissions' in navigator) {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permissionStatus.state === 'granted') {
        return { granted: true };
      } else if (permissionStatus.state === 'denied') {
        return { granted: false, error: t('voice.permissions.camera.deniedShort') };
      }
      // If state is 'prompt', we need to try to access the camera to trigger the permission prompt
    }

    // Try to access the camera to check/request permission
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      // If we got here, permission was granted
      // Immediately stop the stream as we were just checking permission
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true };
    } catch (error: any) {
      // Permission was denied or device not available
      const errorMessage = error.name === 'NotAllowedError' 
        ? t('voice.permissions.camera.deniedDetailed')
        : error.name === 'NotFoundError'
        ? t('voice.permissions.camera.notFound')
        : error.name === 'NotReadableError'
        ? t('voice.permissions.camera.inUse')
        : t('voice.permissions.camera.accessFailed', { error: error.message || 'Unknown error' });
      
      return { granted: false, error: errorMessage };
    }
  } catch (error: any) {
    return { 
      granted: false, 
      error: t('voice.permissions.camera.checkFailed', { error: error.message || 'Unknown error' }) 
    };
  }
}

/**
 * Request camera permission explicitly
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  return checkCameraPermission();
}
