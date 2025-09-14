<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Palette class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.appearance.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.appearance.subtitle') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Actions / Reset -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 flex items-center justify-between">
            <div class="text-sm text-text-secondary">{{ t('settings.appearance.subtitle') }}</div>
            <button class="btn-secondary btn-xs" @click="resetAppearance">{{ t('settings.appearance.resetAll') }}</button>
          </div>
        </section>

        <!-- Theme -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.theme.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.theme.description') }}</p>
          </div>
          <div class="p-5">
            <div class="inline-flex rounded-lg border border-border-default overflow-hidden">
              <button type="button"
                      :class="appearance.theme === 'system' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                      class="px-3 py-1.5 text-sm"
                      @click="appearance.theme = 'system'">
                {{ t('settings.appearance.theme.system') }}
              </button>
              <button type="button"
                      :class="appearance.theme === 'dark' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                      class="px-3 py-1.5 text-sm border-l border-border-default"
                      @click="appearance.theme = 'dark'">
                {{ t('settings.appearance.theme.dark') }}
              </button>
              <button type="button"
                      :class="appearance.theme === 'light' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                      class="px-3 py-1.5 text-sm border-l border-border-default"
                      @click="appearance.theme = 'light'">
                {{ t('settings.appearance.theme.light') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Time format -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.time.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.time.description') }}</p>
          </div>
          <div class="p-5">
            <div class="inline-flex rounded-lg border border-border-default overflow-hidden">
              <button type="button"
                      :class="appearance.timeFormat === '24h' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                      class="px-3 py-1.5 text-sm"
                      @click="appearance.timeFormat = '24h'">
                {{ t('settings.appearance.time.h24') }}
              </button>
              <button type="button"
                      :class="appearance.timeFormat === '12h' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                      class="px-3 py-1.5 text-sm border-l border-border-default"
                      @click="appearance.timeFormat = '12h'">
                {{ t('settings.appearance.time.h12') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Zoom -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.zoom.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.zoom.description') }}</p>
          </div>
          <div class="p-5 flex items-center gap-4">
            <button class="btn-secondary btn-xs" @click="stepZoom(-10)">-10%</button>
            <input type="range" min="50" max="200" step="10" v-model.number="appearance.zoom" class="w-64" />
            <button class="btn-secondary btn-xs" @click="stepZoom(10)">+10%</button>
            <span class="text-sm text-text-secondary w-16 text-right">{{ appearance.zoom }}%</span>
            <button class="btn-secondary btn-sm" @click="appearance.zoom = 100">{{ t('settings.appearance.zoom.reset') }}</button>
          </div>
        </section>

        <!-- UI customization -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.ui.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.ui.description') }}</p>
          </div>
          <div class="p-5 space-y-3">
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="appearance.reduceMotion" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
              <span class="text-sm">{{ t('settings.appearance.ui.reduceMotion') }}</span>
            </label>
          </div>
        </section>

        <!-- Preview -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.preview.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.preview.description') }}</p>
          </div>
          <div class="p-5">
            <div class="rounded-lg border border-border-default bg-bg-base/60 p-4 space-y-3 max-w-md">
              <div class="text-sm font-medium">Aa Sample Heading</div>
              <div class="text-text-secondary text-sm">Sample paragraph demonstrating contrast and text color hierarchy.</div>
              <div class="flex items-center gap-3">
                <button class="btn-primary btn-xs">Primary</button>
                <button class="btn-secondary btn-xs">Secondary</button>
                <span class="text-xs text-text-tertiary ml-auto">{{ sampleTime }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Palette } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useAppearanceSettings } from '@/composables/useAppearanceSettings';
import { computed } from 'vue';
const { t } = useI18n();
const { appearance, reset } = useAppearanceSettings();

function resetAppearance() {
  reset();
}

function stepZoom(delta: number) {
  const next = Math.max(50, Math.min(200, appearance.zoom + delta));
  appearance.zoom = next;
}

const sampleTime = computed(() => {
  const date = new Date();
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: appearance.timeFormat === '12h' }).format(date);
});
</script>
