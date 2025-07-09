<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="handleCancel">
    <div class="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <div class="flex items-start gap-4">
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            variant === 'danger' ? 'bg-red-500/10' : 'bg-[var(--accent-primary)]/10'
          ]"
        >
          <component
            :is="iconComponent"
            :class="[
              'w-6 h-6',
              variant === 'danger' ? 'text-red-500' : 'text-[var(--accent-primary)]'
            ]"
          />
        </div>

        <div class="flex-1">
          <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {{ title }}
          </h3>
          <p class="text-[var(--text-secondary)]">
            {{ message }}
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :disabled="isLoading"
          :class="[
            'px-6 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center',
            variant === 'danger'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90'
          ]"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, Info, Loader2 } from 'lucide-vue-next'

interface Props {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'info' | 'danger'
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
  isLoading: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const iconComponent = computed(() => {
  return props.variant === 'danger' ? AlertCircle : Info
})

function handleConfirm() {
  if (!props.isLoading) {
    emit('confirm')
  }
}

function handleCancel() {
  if (!props.isLoading) {
    emit('cancel')
  }
}
</script>