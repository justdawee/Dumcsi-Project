<template>
  <div class="h-full w-full bg-gradient-to-br from-bg-base via-bg-base to-bg-surface/20 text-text-default overflow-y-auto scrollbar-thin">
    <!-- Content Container -->
    <div class="max-w-4xl mx-auto p-4 sm:p-8">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Bell class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
          <p class="mt-1 text-sm text-text-muted">Control when and how you receive notifications</p>
        </div>
      </header>

      <!-- Coming Soon Card -->
      <div class="bg-bg-surface/50 backdrop-blur-md rounded-2xl shadow-2xl border border-border-default/50 overflow-hidden">
        <div class="p-8 text-center">
          <Bell class="w-16 h-16 text-text-muted mx-auto mb-4"/>
          <h3 class="text-lg font-semibold mb-2">Coming Soon</h3>
          <p class="text-text-muted">Push notifications, sound alerts, desktop notifications, and notification scheduling will be available here.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell } from 'lucide-vue-next';
</script>