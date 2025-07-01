<template>
  <div class="flex items-center justify-center p-8">
    <div class="max-w-md text-center">
      <div class="w-20 h-20 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
        <AlertTriangle class="w-10 h-10 text-red-400" />
      </div>
      <h2 class="text-xl font-semibold text-white mb-2">{{ title }}</h2>
      <p class="text-gray-400">{{ message }}</p>
      <button
        v-if="showRetry"
        @click="$emit('retry')"
        class="mt-4 btn-primary"
      >
        Try Again
      </button>
    </div>
  </div>
</template>

<script setup>
import { AlertTriangle } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    default: 'Something went wrong'
  },
  message: {
    type: String,
    default: 'An unexpected error occurred. Please try again.'
  },
  showRetry: {
    type: Boolean,
    default: false
  }
})

defineEmits(['retry'])
</script>