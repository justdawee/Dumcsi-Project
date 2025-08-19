export interface KeyBinding {
  id: string;
  name: string;
  category: string;
  description: string;
  scope?: 'global' | 'channel' | 'dm' | 'settings' | 'voice'; // Scope where shortcut is active
  defaultKey: {
    windows: string;
    mac: string;
  };
  currentKey?: string;
  action: () => void;
}

export interface KeyBindCategory {
  id: string;
  name: string;
  keybinds: KeyBinding[];
}

export interface VoiceSettings {
  inputMode: 'voiceActivity' | 'pushToTalk';
  pushToTalkKey: string;
  pushToTalkReleaseDelay: number; // in milliseconds
  inputSensitivity: number;
  outputVolume: number;
  inputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

export interface ParsedKey {
  modifiers: KeyModifier[];
  key: string;
  displayName: string;
}