<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Globe class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.language.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.language.description') }}</p>
        </div>
      </header>

      <!-- Language Selection -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden">
        <div class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-medium mb-2">{{ t('settings.language.selectLabel') }}</label>
            <div class="flex items-center gap-3">
              <select v-model="selectedLocale" class="bg-bg-base border border-border-default rounded-md px-3 py-2">
                <option value="en-US">{{ t('settings.language.englishUS') }}</option>
              </select>
              <button @click="apply" class="px-3 py-2 rounded-md bg-primary text-white text-sm">{{ t('settings.language.save') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Globe } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@/i18n';
import { useToast } from '@/composables/useToast';

const { t, locale } = useI18n();
const { addToast } = useToast();
const selectedLocale = ref<string>(String((locale as any).value || 'en-US'));

function apply() {
  try { setLocale(selectedLocale.value); } catch {}
  addToast({ type: 'success', message: t('settings.language.saved') });
}
</script>
