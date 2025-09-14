import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useToast, type AddToastPayload } from '@/composables/useToast';
import { UserStatus } from '@/services/types';
import { playChime } from '@/utils/sounds';

export type NotificationCategory = 'server' | 'dm' | 'toast';

type CategoryPrefs = {
  enabled: boolean;
  playSound: boolean;
  volume: number; // 0..1
  respectDnd: boolean; // if true, mute/ignore when Busy
};

type BrowserPrefs = {
  enabled: boolean;
  respectDnd: boolean;
};

type Preferences = {
  browser: BrowserPrefs;
  categories: Record<NotificationCategory, CategoryPrefs>;
};

type NotifyOptions = {
  category: NotificationCategory;
  title?: string;
  message: string;
  // Show in-app toast
  showToast?: boolean;
  toast?: Omit<AddToastPayload, 'message'>; // message comes from top-level
  // Show browser notification
  showBrowser?: boolean;
  // Play sound
  playSound?: boolean;
  // Optional routing metadata
  meta?: { serverId?: number; channelId?: number; dmUserId?: number };
};

const STORAGE_KEY = 'dumcsi:notification-prefs:v1';

function defaultPrefs(): Preferences {
  return {
    browser: { enabled: false, respectDnd: true },
    categories: {
      server: { enabled: true, playSound: true, volume: 0.8, respectDnd: true },
      dm: { enabled: true, playSound: true, volume: 0.9, respectDnd: true },
      toast: { enabled: true, playSound: false, volume: 0.5, respectDnd: true },
    },
  };
}

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Preferences;
      // Shallow merge to ensure new fields have defaults
      const d = defaultPrefs();
      return {
        browser: { ...d.browser, ...(parsed.browser || {}) },
        categories: {
          server: { ...d.categories.server, ...(parsed.categories as any)?.server },
          dm: { ...d.categories.dm, ...(parsed.categories as any)?.dm },
          toast: { ...d.categories.toast, ...(parsed.categories as any)?.toast },
        },
      };
    }
  } catch {}
  return defaultPrefs();
}

function savePrefs(p: Preferences) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export const useNotificationCenter = defineStore('notificationCenter', () => {
  const prefs = ref<Preferences>(loadPrefs());
  const permission = ref<NotificationPermission>('default');

  const appStore = useAppStore();
  const { addToast } = useToast();

  const isDnd = computed(() => appStore.selfStatus === UserStatus.Busy);

  function setCategoryEnabled(category: NotificationCategory, enabled: boolean) {
    prefs.value.categories[category].enabled = enabled;
    savePrefs(prefs.value);
  }
  function setCategoryPlaySound(category: NotificationCategory, play: boolean) {
    prefs.value.categories[category].playSound = play;
    savePrefs(prefs.value);
  }
  function setCategoryRespectDnd(category: NotificationCategory, respect: boolean) {
    prefs.value.categories[category].respectDnd = respect;
    savePrefs(prefs.value);
  }
  function setCategoryVolume(category: NotificationCategory, volume: number) {
    const v = Math.min(1, Math.max(0, volume || 0));
    prefs.value.categories[category].volume = v;
    savePrefs(prefs.value);
  }

  function setBrowserEnabled(_enabled: boolean) { /* deprecated: no-op */ }
  function setBrowserRespectDnd(_respect: boolean) { /* deprecated: no-op */ }

  async function requestBrowserPermission(): Promise<NotificationPermission> { return 'denied'; }

  function showBrowserNotification(_title: string, _body: string, _data?: any) { /* disabled */ }

  function notify(options: NotifyOptions) {
    const cat = options.category;
    const c = prefs.value.categories[cat];
    if (!c?.enabled) return; // category disabled -> ignore

    const dnd = isDnd.value && c.respectDnd;

    // In-app toast (if requested and toast category enabled)
    if (options.showToast && prefs.value.categories.toast.enabled) {
      addToast({
        type: options.toast?.type || 'info',
        title: options.title,
        message: options.message,
        duration: options.toast?.duration,
        actions: options.toast?.actions,
        onClick: options.toast?.onClick,
        quickReply: options.toast?.quickReply,
        meta: options.toast?.meta || options.meta,
        notificationCategory: options.category,
      });
    }

    // If a UI toast was shown, let the toast handler handle sound/browser to avoid duplicates
    if (!options.showToast) {
      // Sound (unless DND for this category)
      const shouldPlaySound = (options.playSound ?? true) && c.playSound && !dnd;
      if (shouldPlaySound) {
        const vol = c.volume;
        const tone: 'server' | 'dm' | 'toast' = (cat === 'dm' ? 'dm' : (cat === 'server' ? 'server' : 'toast'));
        playChime(tone, vol).catch(() => {});
      }
      // Browser notifications are disabled
    }

  }

  function reset() {
    prefs.value = defaultPrefs();
    savePrefs(prefs.value);
  }

  return {
    // state
    prefs,
    permission,
    isDnd,
    // actions
    notify,
    requestBrowserPermission,
    showBrowserNotification,
    setCategoryEnabled,
    setCategoryPlaySound,
    setCategoryRespectDnd,
    setCategoryVolume,
    setBrowserEnabled,
    setBrowserRespectDnd,
    reset,
  };
});
