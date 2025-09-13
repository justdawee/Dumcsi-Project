<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
        @click.self="$emit('update:modelValue', false)"
    >
      <div
          class="w-full max-w-md transform rounded-2xl bg-bg-surface p-6 text-left align-middle shadow-xl transition-all border border-border-default/50">
        <div class="flex items-start space-x-2.5">
          <div
              :class="['flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full', intentClasses.iconContainer]">
            <component :is="intentClasses.icon" :class="['h-6 w-6', intentClasses.iconColor]" aria-hidden="true"/>
          </div>
          <div class="flex-1 overflow-hidden">
            <h3 id="modal-title" class="text-lg font-semibold leading-6 text-text-default">{{ titleText }}</h3>
            <div class="mt-2">
              <p class="text-sm text-text-muted whitespace-pre-line">
                {{ messageText }}
              </p>

              <div v-if="$slots.content || contentDetails"
                   class="mt-4 p-3 bg-bg-base/50 rounded-lg border border-border-default/50 max-h-40 overflow-y-auto scrollbar-thin">
                <slot name="content">
                  <p v-if="contentDetails" class="text-sm text-text-secondary italic whitespace-pre-wrap break-words">
                    "{{ contentDetails }}"</p>
                </slot>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
          <button
              :class="['w-full sm:w-auto', intentClasses.button, { 'opacity-50 cursor-wait': isLoading }]"
              :disabled="isLoading"
              type="button"
              @click="$emit('confirm')"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2"/>
            {{ confirmTextComputed }}
          </button>
          <button
              :disabled="isLoading"
              class="w-full sm:w-auto mt-3 sm:mt-0 btn-secondary"
              type="button"
              @click="$emit('update:modelValue', false)"
          >
            {{ cancelTextComputed }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {computed} from 'vue';
import type {Component} from 'vue';
import {AlertTriangle, Loader2, CheckCircle2, Info} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  intent?: 'danger' | 'success' | 'warning' | 'info';
  contentDetails?: string | null;
}>(), {
  title: undefined,
  message: undefined,
  confirmText: undefined,
  cancelText: undefined,
  isLoading: false,
  intent: 'danger',
  contentDetails: null,
});

defineEmits(['update:modelValue', 'confirm']);

const { t } = useI18n();

// i18n-resolved texts
const titleText = computed(() => props.title ?? t('common.confirm.title'));
const messageText = computed(() => props.message ?? t('common.confirm.message'));
const confirmTextComputed = computed(() => props.confirmText ?? t('common.confirm.confirm'));
const cancelTextComputed = computed(() => props.cancelText ?? t('common.cancel'));

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
