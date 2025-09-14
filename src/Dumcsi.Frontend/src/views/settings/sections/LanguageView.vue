<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Globe class="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.language.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.language.description') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Language cards -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.language.selectLabel') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.language.selectDescription') }}</p>
          </div>
          <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              v-for="loc in locales"
              :key="loc.code"
              type="button"
              class="group relative text-left rounded-xl border border-border-default bg-bg-base/60 hover:bg-bg-base transition overflow-hidden"
              :class="[
                selectedLocale === loc.code && !loc.disabled ? 'ring-2 ring-primary border-primary/40' : '',
                loc.disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              ]"
              @click="onSelect(loc)"
            >
              <div class="p-4 flex items-center gap-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-bg-surface border border-border-default">
                  <span class="text-xl leading-none">{{ loc.flag }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <div class="font-medium truncate">{{ loc.name }}</div>
                    <div v-if="selectedLocale === loc.code && !loc.disabled" class="ml-auto text-primary">
                      <Check class="w-4 h-4" />
                    </div>
                  </div>
                  <div class="text-xs text-text-tertiary truncate">{{ loc.nativeName }}</div>
                </div>

                <div v-if="loc.disabled" class="ml-auto text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-gray-700/50 border border-gray-600 text-text-muted">
                  {{ t('settings.common.comingSoon') }}
                </div>
              </div>
            </button>
          </div>

          <div class="px-5 pb-5 flex items-center gap-3">
            <button class="btn-primary" type="button" @click="apply" :disabled="selectedLocale === String(locale)">
              {{ t('settings.language.save') }}
            </button>
          </div>
        </section>

        <!-- Preview -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.language.previewTitle') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.language.previewDescription') }}</p>
          </div>
          <div class="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 rounded-lg bg-bg-base/60 border border-border-default">
              <div class="text-xs text-text-tertiary mb-1">{{ t('settings.language.preview.dateTime') }}</div>
              <div class="text-sm font-medium truncate">{{ formattedDate }}</div>
            </div>
            <div class="p-4 rounded-lg bg-bg-base/60 border border-border-default">
              <div class="text-xs text-text-tertiary mb-1">{{ t('settings.language.preview.number') }}</div>
              <div class="text-sm font-medium">{{ formattedNumber }}</div>
            </div>
            <div class="p-4 rounded-lg bg-bg-base/60 border border-border-default">
              <div class="text-xs text-text-tertiary mb-1">{{ t('settings.language.preview.currency') }}</div>
              <div class="text-sm font-medium">{{ formattedCurrency }}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Globe } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@/i18n';
import { useToast } from '@/composables/useToast';

const { t, locale } = useI18n();
const { addToast } = useToast();

type LocaleOption = {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // emoji flag for lightweight visuals
  disabled?: boolean;
};

const locales = ref<LocaleOption[]>([
  { code: 'en-US', name: t('settings.language.englishUS'), nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧', disabled: true },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', disabled: true },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷', disabled: true },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', disabled: true },
  { code: 'hu-HU', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', disabled: true },
]);

const selectedLocale = ref<string>(String((locale as any).value || 'en-US'));

function onSelect(loc: LocaleOption) {
  if (loc.disabled) return;
  selectedLocale.value = loc.code;
}

function currencyForLocale(code: string): string {
  switch (code) {
    case 'en-GB': return 'GBP';
    case 'de-DE': return 'EUR';
    case 'fr-FR': return 'EUR';
    case 'es-ES': return 'EUR';
    case 'hu-HU': return 'HUF';
    default: return 'USD';
  }
}

const formattedDate = computed(() => {
  try {
    return new Intl.DateTimeFormat(selectedLocale.value, { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  }
});

const formattedNumber = computed(() => {
  try {
    return new Intl.NumberFormat(selectedLocale.value).format(1234567.89);
  } catch {
    return new Intl.NumberFormat('en-US').format(1234567.89);
  }
});

const formattedCurrency = computed(() => {
  const cur = currencyForLocale(selectedLocale.value);
  try {
    return new Intl.NumberFormat(selectedLocale.value, { style: 'currency', currency: cur }).format(12345.67);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(12345.67);
  }
});

function apply() {
  try { setLocale(selectedLocale.value); } catch {}
  addToast({ type: 'success', message: t('settings.language.saved') });
}
</script>
