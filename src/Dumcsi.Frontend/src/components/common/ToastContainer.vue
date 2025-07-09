<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-3">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="max-w-sm rounded-lg shadow-lg p-4 flex items-start space-x-3"
          :class="toastClasses(toast.type)"
        >
          <div class="flex-shrink-0">
            <CheckCircle v-if="toast.type === 'success'" class="w-5 h-5" />
            <XCircle v-else-if="toast.type === 'danger'" class="w-5 h-5" />
            <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5" />
            <Info v-else class="w-5 h-5" />
          </div>
          
          <div class="flex-1 min-w-0">
            <h4 v-if="toast.title" class="font-medium text-sm">{{ toast.title }}</h4>
            <p class="text-sm" :class="{ 'mt-1': toast.title }">{{ toast.message }}</p>
          </div>
          
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import type { Toast } from '@/types'

const { toasts, removeToast } = useToast()

const toastClasses = (type: Toast['type']): string => {
  const baseClasses = 'border'
  
  switch (type) {
    case 'success':
      return `${baseClasses} bg-green-50 border-green-200 text-green-800`
    case 'danger':
      return `${baseClasses} bg-red-50 border-red-200 text-red-800`
    case 'warning':
      return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`
    case 'info':
    default:
      return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>