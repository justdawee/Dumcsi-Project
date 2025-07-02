<template>
  <Transition name="modal-fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="w-full max-w-md transform rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
        <div class="flex items-start space-x-2.5">
          <div :class="['flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full', intentClasses.iconContainer]">
            <component :is="intentClasses.icon" :class="['h-6 w-6', intentClasses.iconColor]" aria-hidden="true" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold leading-6 text-white" id="modal-title">{{ title }}</h3>
            <div class="mt-2">
              <p class="text-sm text-gray-400 whitespace-pre-line">
                {{ message }}
              </p>
            </div>
          </div>
        </div>
        
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            :class="['w-full sm:w-auto', intentClasses.button, { 'opacity-50 cursor-wait': isLoading }]"
            :disabled="isLoading"
            @click="$emit('confirm')"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2" />
            {{ confirmText }}
          </button>
          <button
            type="button"
            class="w-full sm:w-auto mt-3 sm:mt-0 btn-secondary"
            :disabled="isLoading"
            @click="$emit('update:modelValue', false)"
          >
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { AlertTriangle, Loader2, CheckCircle2, Info } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  intent?: 'danger' | 'success' | 'warning' | 'info';
}>(), {
  title: 'Are you sure?',
  message: 'This action cannot be undone.',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isLoading: false,
  intent: 'danger',
});

defineEmits(['update:modelValue', 'confirm']);

const intentClasses = computed(() => {
  switch (props.intent) {
    case 'success':
      return {
        icon: CheckCircle2 as Component,
        iconContainer: 'bg-green-500/20',
        iconColor: 'text-green-400',
        button: 'btn-success'
      };
    case 'warning':
      return {
        icon: AlertTriangle as Component,
        iconContainer: 'bg-yellow-500/20',
        iconColor: 'text-yellow-400',
        button: 'btn-warning'
      };
    case 'info':
      return {
        icon: Info as Component,
        iconContainer: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        button: 'btn-info'
      };
    case 'danger':
    default:
      return {
        icon: AlertTriangle as Component,
        iconContainer: 'bg-red-500/20',
        iconColor: 'text-red-400',
        button: 'btn-danger'
      };
  }
});
</script>

<style scoped>
/* A stílusok most már a globális style.css-ből fognak érkezni */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>