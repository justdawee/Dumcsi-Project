<template>
  <div class="h-full w-full p-4 sm:p-8 bg-bg-base text-text-default overflow-y-auto scrollbar-thin">
    <div class="w-full mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Mic class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Voice & Video</h1>
          <p class="mt-1 text-sm text-text-muted">Configure your audio and video settings</p>
        </div>
      </header>

      <!-- Coming Soon Card -->
      <div class="bg-bg-surface/50 backdrop-blur-md rounded-2xl shadow-2xl border border-border-default/50 overflow-hidden">
        <div class="p-8 text-center">
          <Mic class="w-16 h-16 text-text-muted mx-auto mb-4"/>
          <h3 class="text-lg font-semibold mb-2">Coming Soon</h3>
          <p class="text-text-muted">Microphone, camera, audio quality settings, and noise suppression will be available here.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mic } from 'lucide-vue-next';
</script>