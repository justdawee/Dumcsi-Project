<template>
  <div
      class="relative flex w-full max-w-sm items-start overflow-hidden rounded-xl border border-border-default/50 bg-bg-surface/50 p-4 shadow-lg backdrop-blur-md cursor-pointer"
      @click="onClick && onClick()"
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
      <p class="font-bold text-text-default">{{ title || typeClasses.title }}</p>
      <p class="mt-1 text-sm text-text-secondary">{{ message }}</p>
      <!-- Quick reply (for DMs) -->
      <div v-if="quickReply" class="mt-3 relative" @click.stop>
        <input
          v-model="replyText"
          type="text"
          :placeholder="quickReply.placeholder || t('ui.toast.quickReplyPlaceholder')"
          class="w-full rounded-md bg-main-800 text-text-default placeholder-text-muted pl-3 pr-10 py-2 text-sm border border-border-default/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          @keydown.enter.prevent="sendQuickReply"
        />
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-default hover:bg-main-700 disabled:opacity-50"
          :disabled="sending || !replyText.trim()"
          @click.stop="sendQuickReply"
          :aria-label="t('ui.toast.sendAria')"
          :title="t('ui.toast.send')"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
      <div v-if="actions && actions.length" class="mt-2 flex gap-2">
        <button
          v-for="(a, idx) in actions"
          :key="idx"
          @click.stop="$emit('action', a)"
          :class="[
            'px-2 py-1 rounded text-sm transition-colors',
            a.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
            a.variant === 'secondary' ? 'bg-bg-hover text-text-default hover:bg-main-700' :
            'bg-primary text-white hover:bg-primary/90'
          ]"
        >
          {{ a.label }}
        </button>
      </div>
    </div>

    <button
        class="ml-3 flex-shrink-0 rounded-full p-1 text-text-muted transition-colors hover:bg-main-700 hover:text-text-default"
        @click.stop="$emit('close')"
    >
      <X class="h-5 w-5"/>
    </button>

    <div v-if="durationMs && durationMs > 0" class="absolute bottom-0 left-0 h-1 w-full">
      <div :class="typeClasses.accentColor" class="h-full animate-progress" :style="{ animationDuration: `${durationMs}ms` }"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue';
import type {Component} from 'vue';
import {CheckCircle2, XCircle, AlertTriangle, Info, X, Send} from 'lucide-vue-next';
import type {ToastType, ToastAction} from '@/composables/useToast';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  message: string;
  type: ToastType;
  title?: string;
  actions?: ReadonlyArray<Readonly<ToastAction>>;
  onClick?: () => void | Promise<void>;
  quickReply?: { placeholder?: string; onSend: (text: string) => void | Promise<void> };
  durationMs?: number;
}>();

const emit = defineEmits(['close', 'action', 'sent']);

const replyText = ref('');
const sending = ref(false);
const { t } = useI18n();

const sendQuickReply = async () => {
  if (!props.quickReply) return;
  const text = replyText.value.trim();
  if (!text) return;
  if (sending.value) return;
  sending.value = true;
  try {
    await props.quickReply.onSend(text);
    emit('sent');
  } catch {
    // keep toast open on failure
  } finally {
    sending.value = false;
  }
};

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return {
        title: t('common.success'),
        icon: CheckCircle2 as Component,
        accentColor: 'bg-green-500',
        iconContainer: 'bg-green-500/10',
        iconColor: 'text-green-400',
      };
    case 'danger':
      return {
        title: t('common.error'),
        icon: XCircle as Component,
        accentColor: 'bg-red-500',
        iconContainer: 'bg-red-500/10',
        iconColor: 'text-red-400',
      };
    case 'warning':
      return {
        title: t('common.warning'),
        icon: AlertTriangle as Component,
        accentColor: 'bg-yellow-500',
        iconContainer: 'bg-yellow-500/10',
        iconColor: 'text-yellow-400',
      };
    case 'info':
    default:
      return {
        title: t('common.info'),
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
