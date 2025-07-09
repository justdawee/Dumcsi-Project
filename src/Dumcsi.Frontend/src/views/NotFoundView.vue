<template>
  <div class="min-h-screen flex items-center justify-center bg-discord-gray-900 px-4">
    <div class="text-center max-w-md">
      <AlertTriangle class="w-16 h-16 text-discord-yellow mx-auto mb-6" />
      <h1 class="text-6xl font-bold text-white mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
      <p class="text-discord-gray-400 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div class="space-y-3">
        <BaseButton @click="$router.push('/app')" full-width>
          Go to App
        </BaseButton>
        <BaseButton @click="$router.back()" variant="ghost" full-width>
          Go Back
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import BaseButton from '@/components/common/BaseButton.vue'
</script>