<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Bell class="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.notifications.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.notifications.description') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Actions -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 flex items-center justify-between">
            <div class="text-sm text-text-secondary">{{ t('settings.notifications.description') }}</div>
            <button class="btn-secondary btn-xs" @click="resetAll">{{ t('settings.notifications.resetAll') }}</button>
          </div>
        </section>

        <!-- Server -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ t('settings.notifications.server.title') }}</h2>
            <input type="checkbox" v-model="server.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
          </div>
          <div class="p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.notifications.server.playSound') }}</div>
              <input type="checkbox" v-model="server.playSound" :disabled="!server.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div class="text-sm text-text-secondary">{{ t('settings.notifications.server.volume') }}</div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="server.volume" :disabled="!server.enabled || !server.playSound" class="w-full sm:col-span-1" />
              <div class="text-right text-sm text-text-muted">{{ Math.round(server.volume * 100) }}%</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.notifications.server.respectDnd') }}</div>
              <input type="checkbox" v-model="server.respectDnd" :disabled="!server.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="pt-2">
              <button class="btn-primary btn-xs" @click="test('server')" :disabled="!server.enabled">{{ t('settings.notifications.server.test') }}</button>
            </div>
          </div>
        </section>

        <!-- Direct Messages -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ t('settings.notifications.dm.title') }}</h2>
            <input type="checkbox" v-model="dm.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
          </div>
          <div class="p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.notifications.dm.playSound') }}</div>
              <input type="checkbox" v-model="dm.playSound" :disabled="!dm.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div class="text-sm text-text-secondary">{{ t('settings.notifications.dm.volume') }}</div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="dm.volume" :disabled="!dm.enabled || !dm.playSound" class="w-full sm:col-span-1" />
              <div class="text-right text-sm text-text-muted">{{ Math.round(dm.volume * 100) }}%</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.notifications.dm.respectDnd') }}</div>
              <input type="checkbox" v-model="dm.respectDnd" :disabled="!dm.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="pt-2">
              <button class="btn-primary btn-xs" @click="test('dm')" :disabled="!dm.enabled">{{ t('settings.notifications.dm.test') }}</button>
            </div>
          </div>
        </section>

        <!-- In-app Toasts -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ t('settings.notifications.toast.title') }}</h2>
            <input type="checkbox" v-model="toast.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
          </div>
          <div class="p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.notifications.toast.playSound') }}</div>
              <input type="checkbox" v-model="toast.playSound" :disabled="!toast.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div class="text-sm text-text-secondary">{{ t('settings.notifications.toast.volume') }}</div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="toast.volume" :disabled="!toast.enabled || !toast.playSound" class="w-full sm:col-span-1" />
              <div class="text-right text-sm text-text-muted">{{ Math.round(toast.volume * 100) }}%</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.notifications.toast.respectDnd') }}</div>
              <input type="checkbox" v-model="toast.respectDnd" :disabled="!toast.enabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="pt-2">
              <button class="btn-primary btn-xs" @click="test('toast')" :disabled="!toast.enabled">{{ t('settings.notifications.toast.test') }}</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationCenter } from '@/stores/notificationCenter';
import { useNotify } from '@/composables/useNotify';

const nc = useNotificationCenter();
const { t } = useI18n();

const server = computed({
  get: () => nc.prefs.categories.server,
  set: (val) => {
    nc.setCategoryEnabled('server', val.enabled);
    nc.setCategoryPlaySound('server', val.playSound);
    nc.setCategoryRespectDnd('server', val.respectDnd);
    nc.setCategoryVolume('server', val.volume);
  }
});
const dm = computed({
  get: () => nc.prefs.categories.dm,
  set: (val) => {
    nc.setCategoryEnabled('dm', val.enabled);
    nc.setCategoryPlaySound('dm', val.playSound);
    nc.setCategoryRespectDnd('dm', val.respectDnd);
    nc.setCategoryVolume('dm', val.volume);
  }
});
const toast = computed({
  get: () => nc.prefs.categories.toast,
  set: (val) => {
    nc.setCategoryEnabled('toast', val.enabled);
    nc.setCategoryPlaySound('toast', val.playSound);
    nc.setCategoryRespectDnd('toast', val.respectDnd);
    nc.setCategoryVolume('toast', val.volume);
  }
});


const { notify } = useNotify();
function test(kind: 'server' | 'dm' | 'toast') {
  const title = kind === 'server' ? 'Server • #general' : (kind === 'dm' ? 'Direct Message' : 'Toast');
  const msg = kind === 'server' ? 'Alice: Hello server!' : (kind === 'dm' ? 'Bob: Hey there!' : 'This is a UI toast');
  notify({ category: kind, title, message: msg, showToast: true, playSound: true });
}

function resetAll() {
  nc.reset();
}
</script>
