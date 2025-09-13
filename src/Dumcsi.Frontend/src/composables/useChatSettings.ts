import { reactive, watch } from 'vue';

export type ChatDensity = 'cozy' | 'compact';

export interface ChatSettings {
  enableFormatting: boolean;
  showMediaPreviews: boolean;
  showTypingIndicators: boolean;
  sendTypingIndicators: boolean;
  density: ChatDensity;
  showAvatars: boolean;
  showTimestamps: boolean;
  bigEmojiOnly: boolean;
}

const STORAGE_KEY = 'dumcsi:chat-settings:v1';

const defaults: ChatSettings = {
  enableFormatting: true,
  showMediaPreviews: true,
  showTypingIndicators: true,
  sendTypingIndicators: true,
  density: 'cozy',
  showAvatars: true,
  showTimestamps: true,
  bigEmojiOnly: true,
};

const settings = reactive<ChatSettings>({ ...defaults });

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatSettings>;
      Object.assign(settings, defaults, parsed || {});
    }
  } catch {
    Object.assign(settings, defaults);
  }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

load();
watch(settings, save, { deep: true });

export function useChatSettings() {
  return { chatSettings: settings };
}

