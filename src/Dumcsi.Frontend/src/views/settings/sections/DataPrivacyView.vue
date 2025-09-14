<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Database class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sections.dataPrivacy') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.privacy.subtitle') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Export Data -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.privacy.export.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.privacy.export.description') }}</p>
          </div>
          <div class="p-5 space-y-3">
            <div class="flex items-center gap-3">
              <button class="btn-primary" @click="exportClientData" :disabled="exporting">
                <span v-if="!exporting">{{ t('settings.privacy.export.download') }}</span>
                <span v-else>{{ t('settings.privacy.export.preparing') }}</span>
              </button>
              <span class="text-xs text-text-tertiary">{{ t('settings.privacy.export.hint') }}</span>
              <span class="ml-auto text-xs text-text-tertiary">{{ t('settings.privacy.export.itemsCount', { count: presentKeys.length }) }}</span>
            </div>
            <details class="rounded-md border border-border-default bg-bg-base/60 p-3 text-xs">
              <summary class="cursor-pointer text-text-secondary">{{ t('settings.privacy.showDetails') }}</summary>
              <ul class="mt-2 list-disc pl-5 space-y-1">
                <li v-for="k in presentKeys" :key="k" class="font-mono break-all">{{ k }}</li>
              </ul>
            </details>
          </div>
        </section>

        <!-- Clear Local Data -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.privacy.clear.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.privacy.clear.description') }}</p>
          </div>
          <div class="p-5 space-y-3">
            <div class="flex items-center gap-3">
              <button class="btn-danger" @click="clearLocalData">{{ t('settings.privacy.clear.button') }}</button>
              <span class="ml-auto text-xs text-text-tertiary">{{ t('settings.privacy.clear.itemsCount', { count: presentKeys.length }) }}</span>
            </div>
            <details class="rounded-md border border-red-900/40 bg-red-900/10 p-3 text-xs">
              <summary class="cursor-pointer text-red-300">{{ t('settings.privacy.showDetails') }}</summary>
              <ul class="mt-2 list-disc pl-5 space-y-1">
                <li v-for="k in LOCAL_KEYS" :key="k" class="font-mono break-all">{{ k }}</li>
              </ul>
            </details>
          </div>
        </section>

        <!-- Sessions section intentionally omitted (moved to separate tab) -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { ref, computed } from 'vue';
import { useToast } from '@/composables/useToast';
// Sessions mgmt intentionally excluded from this tab

const { t } = useI18n();
const { addToast } = useToast();
const exporting = ref(false);

function safeGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

const LOCAL_KEYS = [
  'dumcsi:locale',
  'audio-settings',
  'dumcsi-voice-settings',
  'dumcsi-keybinds',
  'dumcsi:notification-prefs:v1',
  'dumcsi:ui-sounds:v1',
  'dumcsi-notification-mutes-v1',
  'dumcsi:lastVoiceSession',
  'dumcsi:userStatusPref',
  'dumcsi-closed-dms',
];

const presentKeys = computed(() => LOCAL_KEYS.filter(k => safeGet(k) != null));

async function exportClientData() {
  exporting.value = true;
  try {
    const data: any = {
      meta: {
        exportedAt: new Date().toISOString(),
        app: 'Dumcsi',
        scope: 'client-preferences',
        excludes: ['token', 'refreshToken'],
      },
      localStorage: {} as Record<string, any>,
    };
    for (const k of LOCAL_KEYS) {
      const raw = safeGet(k);
      if (raw != null) {
        try { (data.localStorage as any)[k] = JSON.parse(raw); }
        catch { (data.localStorage as any)[k] = raw; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dumcsi-client-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}

function clearLocalData() {
  const confirmed = confirm(t('settings.privacy.clear.confirm'));
  if (!confirmed) return;
  for (const k of LOCAL_KEYS) safeRemove(k);
  addToast({ type: 'success', message: t('settings.privacy.clear.done') });
}
</script>
