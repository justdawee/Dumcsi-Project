<template>
  <div class="fixed bottom-5 right-5 z-[100] space-y-3">
    <TransitionGroup name="toast">
      <ToastMessage
          v-for="toast in toasts"
          :key="toast.id"
          :message="toast.message"
          :title="toast.title"
          :type="toast.type"
          :actions="toast.actions"
          :on-click="toast.onClick"
          :quick-reply="toast.quickReply"
          :duration-ms="toast.durationMs"
          @close="removeToast(toast.id)"
          @action="(a) => { try { a.action(); } finally { removeToast(toast.id); } }"
          @sent="() => removeToast(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import {useToast} from '@/composables/useToast';
import ToastMessage from './ToastMessage.vue';

const {toasts, removeToast} = useToast();
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.5s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
