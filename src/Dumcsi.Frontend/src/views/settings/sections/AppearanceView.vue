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
        <!-- Theme -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.theme.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.theme.description') }}</p>
          </div>
          <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="flex items-center gap-2">
              <input type="radio" name="theme" value="system" v-model="appearance.theme" />
              <span class="text-sm">{{ t('settings.appearance.theme.system') }}</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" name="theme" value="dark" v-model="appearance.theme" />
              <span class="text-sm">{{ t('settings.appearance.theme.dark') }}</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" name="theme" value="light" v-model="appearance.theme" />
              <span class="text-sm">{{ t('settings.appearance.theme.light') }}</span>
            </label>
          </div>
        </section>

        <!-- Time format -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.time.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.time.description') }}</p>
          </div>
          <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="flex items-center gap-2">
              <input type="radio" name="timefmt" value="24h" v-model="appearance.timeFormat" />
              <span class="text-sm">{{ t('settings.appearance.time.h24') }}</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" name="timefmt" value="12h" v-model="appearance.timeFormat" />
              <span class="text-sm">{{ t('settings.appearance.time.h12') }}</span>
            </label>
          </div>
        </section>

        <!-- Zoom -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.zoom.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.appearance.zoom.description') }}</p>
          </div>
          <div class="p-5 flex items-center gap-4">
            <input type="range" min="50" max="200" step="10" v-model.number="appearance.zoom" class="w-64" />
            <span class="text-sm text-text-secondary w-16">{{ appearance.zoom }}%</span>
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
              <input type="checkbox" v-model="appearance.reduceMotion" />
              <span class="text-sm">{{ t('settings.appearance.ui.reduceMotion') }}</span>
            </label>
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
const { t } = useI18n();
const { appearance } = useAppearanceSettings();
</script>
