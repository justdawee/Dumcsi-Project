<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none">
        <div class="absolute inset-0 bg-black/75"></div>
        <div class="relative z-10 text-center text-white space-y-2">
          <p class="text-lg font-semibold">{{ t('ui.fileDrop.uploadTo', { channel: `#${channelName}` }) }}</p>
          <p>{{ t('ui.fileDrop.addComments') }}</p>
          <p class="text-sm text-gray-300">{{ t('ui.fileDrop.holdShift') }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useI18n } from 'vue-i18n';

const appStore = useAppStore();
const channelName = computed(() => appStore.currentChannel?.name ?? 'channel');
const { t } = useI18n();

const visible = ref(false);
let dragCounter = 0;

const isDragAllowed = () => {
  if (!appStore.currentChannel) return false;
  // when any modal is open, a fullscreen fixed element is present
  // which has pointer events enabled. avoid showing the overlay then
  const modalOpen = document.querySelector('.fixed.inset-0:not(.pointer-events-none)');
  return !modalOpen;
};

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

const show = (e: DragEvent) => {
  if (!isDragAllowed() || !hasFiles(e)) return;
  dragCounter++;
  visible.value = true;
};

const hide = (e: DragEvent) => {
  if (!isDragAllowed() || !hasFiles(e)) return;
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) visible.value = false;
};

const prevent = (e: DragEvent) => {
  if (hasFiles(e)) e.preventDefault();
};

const handleDrop = (e: DragEvent) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  if (!isDragAllowed()) return;
  const files = e.dataTransfer?.files;
  const direct = e.shiftKey;
  dragCounter = 0;
  visible.value = false;
  if (files && files.length > 0) {
    window.dispatchEvent(new CustomEvent('global-files-dropped', { detail: { files, direct } }));
  }
};

onMounted(() => {
  window.addEventListener('dragenter', show);
  window.addEventListener('dragleave', hide);
  window.addEventListener('dragover', prevent);
  window.addEventListener('drop', handleDrop);
});

onUnmounted(() => {
  window.removeEventListener('dragenter', show);
  window.removeEventListener('dragleave', hide);
  window.removeEventListener('dragover', prevent);
  window.removeEventListener('drop', handleDrop);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
