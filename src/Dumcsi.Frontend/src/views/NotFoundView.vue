<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-base">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-24 h-24 mb-6 bg-main-800 rounded-full">
        <AlertCircle class="w-12 h-12 text-text-muted" />
      </div>
      <h1 class="text-6xl font-bold text-text-default mb-4">404</h1>
      <p class="text-xl text-text-secondary mb-8">{{ t('common.notFound.title') }}</p>
      <p class="text-text-muted mb-8">{{ t('common.notFound.description') }}</p>
      <RouterLink
          to="/"
          class="btn-primary"
      >
        <Home class="w-5 h-5 mr-2 inline" />
        {{ t('common.notFound.goHome') }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, Home } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
