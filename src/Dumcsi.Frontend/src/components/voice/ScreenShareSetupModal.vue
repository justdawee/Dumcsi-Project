<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60" @click="$emit('close')"></div>
    <div class="relative bg-main-900 border border-border-default rounded-lg w-full max-w-lg shadow-xl">
      <div class="p-4 border-b border-border-default">
        <h3 class="text-lg font-semibold text-text-default">Share Your Screen</h3>
        <p class="text-sm text-text-muted mt-1">Choose quality and audio, then pick the window in the browser dialog.</p>
      </div>

      <div class="p-4 space-y-6">
        <!-- Resolution -->
        <div>
          <div class="text-xs font-medium text-text-secondary mb-2">Resolution</div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in resolutionOptions"
              :key="opt.value"
              @click="selectedRes = opt"
              :class="[
                'px-3 py-2 rounded border text-sm text-left',
                selectedRes.value === opt.value
                  ? 'border-primary bg-primary/20 text-text-default'
                  : 'border-border-default bg-main-800 text-text-secondary hover:bg-main-700'
              ]"
            >
              <div class="font-medium">{{ opt.label }}</div>
              <div class="text-xs opacity-75">{{ opt.resolution }}</div>
            </button>
          </div>
        </div>

        <!-- Frame rate -->
        <div>
          <div class="text-xs font-medium text-text-secondary mb-2">Frame Rate</div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="fps in fpsOptions"
              :key="fps.value"
              @click="selectedFPS = fps.value"
              :class="[
                'px-3 py-2 rounded border text-sm text-left',
                selectedFPS === fps.value
                  ? 'border-primary bg-primary/20 text-text-default'
                  : 'border-border-default bg-main-800 text-text-secondary hover:bg-main-700'
              ]"
            >
              <div class="font-medium">{{ fps.label }}</div>
              <div class="text-xs opacity-75">{{ fps.description }}</div>
            </button>
          </div>
        </div>

        <!-- Audio -->
        <div>
          <label class="flex items-center gap-2 text-sm text-text-default">
            <input type="checkbox" v-model="includeAudio" class="rounded border-border-default bg-main-800 text-primary" />
            Include system/tab audio (if supported)
          </label>
          <div class="text-xs text-text-tertiary mt-1 ml-6">Tab/system audio availability depends on browser.</div>
        </div>
      </div>

      <div class="p-4 border-t border-border-default flex justify-end gap-2">
        <button @click="$emit('close')" class="px-3 py-2 text-sm rounded bg-main-800 hover:bg-main-700 text-text-secondary">Cancel</button>
        <button @click="confirm" class="px-3 py-2 text-sm rounded bg-primary text-white hover:opacity-90">Start Sharing</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export interface ScreenShareSetup {
  width: number;
  height: number;
  frameRate: number;
  includeAudio: boolean;
}

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', value: ScreenShareSetup): void }>();

const resolutionOptions = [
  { value: '4k', label: '4K Ultra', resolution: '3840×2160', width: 3840, height: 2160 },
  { value: '1080p', label: '1080p HD', resolution: '1920×1080', width: 1920, height: 1080 },
  { value: '720p', label: '720p', resolution: '1280×720', width: 1280, height: 720 },
  { value: '480p', label: '480p', resolution: '854×480', width: 854, height: 480 }
];
const fpsOptions = [
  { value: 15, label: '15 FPS', description: 'Low motion (saves bandwidth)' },
  { value: 30, label: '30 FPS', description: 'Standard (recommended)' },
  { value: 60, label: '60 FPS', description: 'Smooth motion (higher bandwidth)' }
];

const selectedRes = ref(resolutionOptions[1]);
const selectedFPS = ref(30);
const includeAudio = ref(true);

const confirm = () => {
  emit('confirm', {
    width: selectedRes.value.width,
    height: selectedRes.value.height,
    frameRate: selectedFPS.value,
    includeAudio: includeAudio.value,
  });
};
</script>

<style scoped>
</style>

