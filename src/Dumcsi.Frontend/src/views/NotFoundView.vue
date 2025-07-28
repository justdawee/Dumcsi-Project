<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-base">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-24 h-24 mb-6 bg-main-800 rounded-full">
        <AlertCircle class="w-12 h-12 text-text-muted" />
      </div>
      <h1 class="text-6xl font-bold text-text-default mb-4">404</h1>
      <p class="text-xl text-text-secondary mb-8">Page not found</p>
      <p class="text-text-muted mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <RouterLink
          to="/"
          class="btn-primary"
      >
        <Home class="w-5 h-5 mr-2 inline" />
        Go Home
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, Home } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
</script>