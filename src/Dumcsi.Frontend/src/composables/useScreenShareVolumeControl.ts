import { ref, readonly } from 'vue';

// Shared volume state for screen share audio (per user)
const userVolumes = ref<Map<number, number>>(new Map());

export function useScreenShareVolumeControl() {
  /**
   * Get volume for a specific user (0.0 to 1.0, where 1 is 100%)
   */
  const getUserVolume = (userId: number): number => {
    return userVolumes.value.get(userId) ?? 1.0; // Default to 100%
  };

  /**
   * Set volume for a specific user (0.0 to 1.0, where 1 is 100%)
   */
  const setUserVolume = (userId: number, volume: number) => {
    // Clamp volume between 0 and 1 (0% to 100%)
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const newVolumes = new Map(userVolumes.value);
    newVolumes.set(userId, clampedVolume);
    userVolumes.value = newVolumes;
  };

  /**
   * Apply volume to an audio element for a specific user
   */
  const applyVolumeToElement = (userId: number, audioElement: HTMLMediaElement) => {
    const volume = getUserVolume(userId);
    audioElement.volume = volume;
  };

  /**
   * Get volume as percentage string for display
   */
  const getVolumePercentage = (userId: number): string => {
    return Math.round(getUserVolume(userId) * 100) + '%';
  };

  return {
    userVolumes: readonly(userVolumes),
    getUserVolume,
    setUserVolume,
    applyVolumeToElement,
    getVolumePercentage,
  };
}
