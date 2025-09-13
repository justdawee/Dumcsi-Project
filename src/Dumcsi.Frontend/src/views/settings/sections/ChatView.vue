<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <MessageSquare class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sections.chat') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.chat.subtitle') }}</p>
        </div>
      </header>

      <!-- Coming Soon Card -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden">
        <div class="p-8 text-center">
          <MessageSquare class="w-16 h-16 text-text-muted mx-auto mb-4"/>
          <h3 class="text-lg font-semibold mb-2">{{ t('settings.chat.comingSoon') }}</h3>
          <p class="text-text-muted">{{ t('settings.chat.comingSoonDesc') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
