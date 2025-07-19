<template>
  <div
      class="relative flex w-full max-w-sm items-start overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 p-4 shadow-lg backdrop-blur-md"
  >
    <div class="mr-3 flex-shrink-0">
      <div
          :class="typeClasses.iconContainer"
          class="flex h-8 w-8 items-center justify-center rounded-full"
      >
        <component :is="typeClasses.icon" :class="typeClasses.iconColor" class="h-5 w-5"/>
      </div>
    </div>

    <div class="flex-1">
      <p class="font-bold text-white">{{ title || typeClasses.title }}</p>
      <p class="mt-1 text-sm text-gray-300">{{ message }}</p>
    </div>

    <button
        class="ml-3 flex-shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-200"
        @click="$emit('close')"
    >
      <X class="h-5 w-5"/>
    </button>

    <div class="absolute bottom-0 left-0 h-1 w-full">
      <div :class="typeClasses.accentColor" class="h-full animate-progress"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue';
import type {Component} from 'vue';
import {CheckCircle2, XCircle, AlertTriangle, Info, X} from 'lucide-vue-next';
import type {ToastType} from '@/composables/useToast';

const props = defineProps<{
  message: string;
  type: ToastType;
  title?: string;
}>();

defineEmits(['close']);

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return {
        title: 'Success',
        icon: CheckCircle2 as Component,
        accentColor: 'bg-green-500',
        iconContainer: 'bg-green-500/10',
        iconColor: 'text-green-400',
      };
    case 'danger':
      return {
        title: 'Error',
        icon: XCircle as Component,
        accentColor: 'bg-red-500',
        iconContainer: 'bg-red-500/10',
        iconColor: 'text-red-400',
      };
    case 'warning':
      return {
        title: 'Warning',
        icon: AlertTriangle as Component,
        accentColor: 'bg-yellow-500',
        iconContainer: 'bg-yellow-500/10',
        iconColor: 'text-yellow-400',
      };
    case 'info':
    default:
      return {
        title: 'Information',
        icon: Info as Component,
        accentColor: 'bg-blue-500',
        iconContainer: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
      };
  }
});
</script>

<style scoped>
@keyframes progress-bar {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-progress {
  animation: progress-bar 3s linear forwards;
}
</style>