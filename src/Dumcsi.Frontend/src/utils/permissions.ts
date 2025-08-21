/**
 * Utility functions for handling browser permissions
 */

export interface PermissionResult {
  granted: boolean;
  error?: string;
}

/**
 * Check if microphone permission is granted
 */
export async function checkMicrophonePermission(): Promise<PermissionResult> {
  try {
    // First, check if the Permissions API is available
    if ('permissions' in navigator) {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state === 'granted') {
        return { granted: true };
      } else if (permissionStatus.state === 'denied') {
        return { granted: false, error: 'Microphone permission was denied' };
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
        ? 'Microphone permission was denied. Please enable microphone access in your browser settings to join voice channels.'
        : error.name === 'NotFoundError'
        ? 'No microphone device found. Please connect a microphone to join voice channels.'
        : error.name === 'NotReadableError'
        ? 'Microphone is already in use by another application.'
        : `Failed to access microphone: ${error.message || 'Unknown error'}`;
      
      return { granted: false, error: errorMessage };
    }
  } catch (error: any) {
    return { 
      granted: false, 
      error: `Failed to check microphone permission: ${error.message || 'Unknown error'}` 
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
  try {
    // First, check if the Permissions API is available
    if ('permissions' in navigator) {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permissionStatus.state === 'granted') {
        return { granted: true };
      } else if (permissionStatus.state === 'denied') {
        return { granted: false, error: 'Camera permission was denied' };
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
        ? 'Camera permission was denied. Please enable camera access in your browser settings to use video features.'
        : error.name === 'NotFoundError'
        ? 'No camera device found. Please connect a camera to use video features.'
        : error.name === 'NotReadableError'
        ? 'Camera is already in use by another application.'
        : `Failed to access camera: ${error.message || 'Unknown error'}`;
      
      return { granted: false, error: errorMessage };
    }
  } catch (error: any) {
    return { 
      granted: false, 
      error: `Failed to check camera permission: ${error.message || 'Unknown error'}` 
    };
  }
}

/**
 * Request camera permission explicitly
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  return checkCameraPermission();
}