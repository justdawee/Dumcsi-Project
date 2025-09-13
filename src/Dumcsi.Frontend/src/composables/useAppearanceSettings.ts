import { reactive, watch } from 'vue';

export type Theme = 'dark' | 'light' | 'system';
export type TimeFormat = '24h' | '12h';

export interface AppearanceSettings {
  theme: Theme;
  timeFormat: TimeFormat;
  zoom: number; // percentage (e.g., 100)
  reduceMotion: boolean;
}

const STORAGE_KEY = 'dumcsi:appearance-settings:v1';

const settings = reactive<AppearanceSettings>({
  theme: 'system',
  timeFormat: '24h',
  zoom: 100,
  reduceMotion: false,
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
      Object.assign(settings, parsed || {});
    }
  } catch {}
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

let mediaList: MediaQueryList | null = null;
function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'system') {
    if (!mediaList) {
      try { mediaList = window.matchMedia('(prefers-color-scheme: dark)'); } catch { mediaList = null; }
      if (mediaList) {
        mediaList.addEventListener?.('change', () => {
          if (settings.theme === 'system') {
            root.toggleAttribute('data-theme', !mediaList!.matches);
            if (!mediaList!.matches) root.setAttribute('data-theme', 'light');
            else root.removeAttribute('data-theme');
          }
        });
      }
    }
    const prefersDark = mediaList?.matches ?? true;
    if (prefersDark) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'light');
  } else if (settings.theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
}

function applyZoom() {
  const z = Math.max(50, Math.min(200, settings.zoom));
  document.documentElement.style.setProperty('--app-zoom', String(z / 100));
}

function applyMotion() {
  const root = document.documentElement;
  if (settings.reduceMotion) root.classList.add('reduced-motion');
  else root.classList.remove('reduced-motion');
}

load();
// Initial apply
applyTheme();
applyZoom();
applyMotion();

watch(settings, () => {
  save();
  applyTheme();
  applyZoom();
  applyMotion();
}, { deep: true });

export function useAppearanceSettings() {
  return { appearance: settings };
}
