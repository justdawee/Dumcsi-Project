<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Smartphone class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sections.devices') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.devices.subtitle') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Device Management -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.devices.device.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.devices.device.description') }}</p>
          </div>
          <div class="p-5 space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('settings.devices.device.name') }}</label>
                <input class="form-input w-full" v-model="deviceName" @change="saveDevicePrefs" :placeholder="t('settings.devices.device.namePlaceholder')"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('settings.devices.device.trusted') }}</label>
                <div class="flex items-center gap-3">
                  <input type="checkbox" v-model="trusted" @change="saveDevicePrefs" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110"/>
                  <span class="text-sm text-text-secondary">{{ t('settings.devices.device.trustedHint') }}</span>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border-default bg-bg-base/60 p-4 space-y-1 text-xs text-text-tertiary">
              <div>
                {{ t('settings.devices.device.userAgent') }}:
                <span class="text-text-default break-all">{{ userAgent }}</span>
              </div>
              <div>
                {{ t('settings.devices.device.platform') }}:
                <span class="text-text-default break-all">{{ platform }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Active Sessions -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">{{ t('settings.devices.sessions.title') }}</h2>
              <p class="text-xs text-text-tertiary mt-1">{{ t('settings.devices.sessions.description') }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn-secondary btn-sm" @click="refreshSessions" :disabled="loading">{{ t('settings.devices.sessions.refresh') }}</button>
              <button class="btn-danger btn-sm" @click="revokeAll" :disabled="revoking">{{ revoking ? t('settings.devices.sessions.revoking') : t('settings.devices.sessions.signOutAll') }}</button>
            </div>
          </div>
          <div class="p-5">
            <div v-if="loading" class="space-y-2">
              <div class="h-16 rounded-lg border border-border-default bg-bg-base/60 animate-pulse"></div>
              <div class="h-16 rounded-lg border border-border-default bg-bg-base/60 animate-pulse"></div>
            </div>
            <div v-else-if="sessions.length === 0" class="text-center text-text-tertiary py-6">{{ t('settings.devices.sessions.empty') }}</div>
            <div v-else class="space-y-2">
              <div v-for="s in sessions" :key="s.id" class="px-4 py-3 rounded-lg border border-border-default bg-bg-base/60">
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <div class="font-medium text-text-default truncate">{{ formatDate(s.createdAt) }}</div>
                      <span v-if="isCurrent(s)" class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-green-600/20 text-green-300">{{ t('settings.devices.sessions.current') }}</span>
                    </div>
                    <div class="text-xs text-text-tertiary truncate">
                      {{ t('settings.devices.sessions.expires') }}: {{ formatDate(s.expiresAt) }}
                    </div>
                    <div class="mt-1 text-xs text-text-tertiary flex items-center gap-2">
                      <span>{{ t('settings.devices.sessions.fingerprint') }}:</span>
                      <span class="font-mono">{{ shortFp(s.fingerprint) }}</span>
                      <button class="btn-secondary btn-xs" @click="copy(s.fingerprint)">Copy</button>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="btn-secondary btn-sm" @click="revokeOne(s.id)" :disabled="isCurrent(s)">{{ t('settings.devices.sessions.signOut') }}</button>
                  </div>
                </div>
              </div>
              <div class="pt-2">
                <button class="btn-secondary btn-sm" @click="revokeOthers" :disabled="sessions.length <= 1">{{ t('settings.devices.sessions.signOutOthers') }}</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Two-Factor Authentication (placeholder) -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.devices.2fa.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.devices.2fa.description') }}</p>
          </div>
          <div class="p-5 flex items-center gap-3">
            <button class="btn-secondary" disabled>{{ t('settings.devices.2fa.enable') }}</button>
            <span class="text-xs text-text-tertiary">{{ t('settings.devices.2fa.comingSoon') }}</span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Smartphone } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { ref, onMounted } from 'vue';
import userService from '@/services/userService';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const { addToast } = useToast();

// Device prefs (local only)
const deviceName = ref<string>('');
const trusted = ref<boolean>(false);
const userAgent = navigator.userAgent;
const platform = (navigator as any).platform || '';

function loadDevicePrefs() {
  try {
    deviceName.value = localStorage.getItem('dumcsi:device-name') || '';
    trusted.value = localStorage.getItem('dumcsi:trusted-device') === 'true';
  } catch {}
}
function saveDevicePrefs() {
  try {
    localStorage.setItem('dumcsi:device-name', deviceName.value || '');
    localStorage.setItem('dumcsi:trusted-device', trusted.value ? 'true' : 'false');
  } catch {}
}

// Sessions
type Session = { id: number; fingerprint: string; createdAt: string; expiresAt: string };
const sessions = ref<Session[]>([]);
const loading = ref<boolean>(false);
const revoking = ref<boolean>(false);

async function refreshSessions() {
  loading.value = true;
  try {
    sessions.value = await userService.getSessions();
  } catch (err: any) {
    addToast({ type: 'danger', message: err?.message || 'Failed to load sessions' });
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function shortFp(fp: string): string { return fp ? fp.substring(0, 10) : ''; }

function copy(text: string) {
  try {
    void navigator.clipboard.writeText(text || '');
    addToast({ type: 'success', message: t('settings.devices.copied') });
  } catch {
    addToast({ type: 'danger', message: t('chat.clipboardUnsupported') });
  }
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  const arr = Array.from(new Uint8Array(digest));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

const currentFingerprint = ref<string>('');
async function computeCurrentFingerprint() {
  try {
    const rt = localStorage.getItem('refreshToken');
    currentFingerprint.value = rt ? await sha256Hex(rt) : '';
  } catch { currentFingerprint.value = ''; }
}
function isCurrent(s: Session): boolean {
  return !!s.fingerprint && !!currentFingerprint.value && s.fingerprint === currentFingerprint.value;
}

async function revokeOne(id: number) {
  try {
    await userService.revokeSession(id);
    await refreshSessions();
  } catch (err: any) {
    addToast({ type: 'danger', message: err?.message || t('settings.devices.sessions.revokeFailed') });
  }
}

async function revokeOthers() {
  const cur = currentFingerprint.value;
  const others = sessions.value.filter(s => s.fingerprint !== cur);
  if (others.length === 0) return;
  revoking.value = true;
  try {
    for (const s of others) {
      await userService.revokeSession(s.id);
    }
    await refreshSessions();
  } catch (err: any) {
    addToast({ type: 'danger', message: err?.message || t('settings.devices.sessions.revokeFailed') });
  } finally {
    revoking.value = false;
  }
}

async function revokeAll() {
  const confirmed = confirm(t('settings.devices.sessions.confirmSignOutAll'));
  if (!confirmed) return;
  revoking.value = true;
  try {
    await userService.revokeAllSessions();
    await refreshSessions();
    addToast({ type: 'success', message: t('settings.devices.sessions.doneSignOutAll') });
  } catch (err: any) {
    addToast({ type: 'danger', message: err?.message || t('settings.devices.sessions.revokeFailed') });
  } finally {
    revoking.value = false;
  }
}

onMounted(async () => {
  loadDevicePrefs();
  await computeCurrentFingerprint();
  await refreshSessions();
});
</script>
