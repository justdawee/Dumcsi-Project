import { defineStore } from 'pinia';
import { ref } from 'vue';
import { playChime } from '@/utils/sounds';

export type UiSoundKey =
  | 'friendRequest'
  | 'voiceJoinSelf'
  | 'voiceLeaveSelf'
  | 'voiceJoinOther'
  | 'screenShareStart'
  | 'screenShareStop'
  | 'micMute'
  | 'micUnmute'
  | 'deafenOn'
  | 'deafenOff';

type SoundPref = { enabled: boolean; volume: number };

type UiSoundPrefs = Record<UiSoundKey, SoundPref> & { masterEnabled: boolean };

const STORAGE_KEY = 'dumcsi:ui-sounds:v1';

function defaults(): UiSoundPrefs {
  return {
    masterEnabled: true,
    friendRequest: { enabled: true, volume: 0.9 },
    voiceJoinSelf: { enabled: true, volume: 0.8 },
    voiceLeaveSelf: { enabled: true, volume: 0.8 },
    voiceJoinOther: { enabled: true, volume: 0.8 },
    screenShareStart: { enabled: true, volume: 0.8 },
    screenShareStop: { enabled: true, volume: 0.8 },
    micMute: { enabled: true, volume: 0.7 },
    micUnmute: { enabled: true, volume: 0.7 },
    deafenOn: { enabled: true, volume: 0.7 },
    deafenOff: { enabled: true, volume: 0.7 },
  };
}

function load(): UiSoundPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as UiSoundPrefs;
    return { ...defaults(), ...parsed };
  } catch {
    return defaults();
  }
}

function save(p: UiSoundPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export const useUiSounds = defineStore('uiSounds', () => {
  const prefs = ref<UiSoundPrefs>(load());

  function setMasterEnabled(enabled: boolean) {
    prefs.value.masterEnabled = enabled;
    save(prefs.value);
  }

  function setEnabled(key: UiSoundKey, enabled: boolean) {
    prefs.value[key].enabled = enabled;
    save(prefs.value);
  }

  function setVolume(key: UiSoundKey, volume: number) {
    const v = Math.min(1, Math.max(0, volume || 0));
    prefs.value[key].volume = v;
    save(prefs.value);
  }

  async function play(key: UiSoundKey) {
    if (!prefs.value.masterEnabled) return;
    const cfg = prefs.value[key];
    if (!cfg?.enabled) return;
    const vol = cfg.volume ?? 0.8;
    // Map keys to tone kinds used by playChime
    const toneMap: Record<UiSoundKey, any> = {
      friendRequest: 'friend',
      voiceJoinSelf: 'voice-join',
      voiceLeaveSelf: 'voice-leave',
      voiceJoinOther: 'voice-other-join',
      screenShareStart: 'screen-start',
      screenShareStop: 'screen-stop',
      micMute: 'mic-mute',
      micUnmute: 'mic-unmute',
      deafenOn: 'deafen-on',
      deafenOff: 'deafen-off',
    } as const;
    try { await playChime(toneMap[key], vol); } catch {}
  }

  function reset() {
    prefs.value = defaults();
    save(prefs.value);
  }

  return {
    prefs,
    setMasterEnabled,
    setEnabled,
    setVolume,
    play,
    reset,
  };
});
