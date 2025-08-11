<template>
  <div class="relative inline-block">
    <button
      @click="showOptions = !showOptions"
      :class="[
        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
        'bg-gray-600 hover:bg-gray-500 text-gray-200'
      ]"
      :title="'Screen sharing quality: ' + selectedResolution.label + ' @ ' + selectedFPS + ' FPS'"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
      </svg>
      <span class="hidden sm:inline">{{ selectedResolution.label }} @ {{ selectedFPS }} FPS</span>
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
        <path d="m6 9-3-3h6l-3 3z"/>
      </svg>
    </button>

    <div
      v-if="showOptions"
      class="absolute bottom-full mb-2 left-0 z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-600 min-w-80"
    >
      <div class="p-2">
        <!-- Resolution Section -->
        <div class="text-xs font-medium text-gray-300 mb-2 px-2">Resolution</div>
        
        <div v-for="option in resolutionOptions" :key="option.value" class="mb-1">
          <button
            @click="selectResolution(option)"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
              selectedResolution.value === option.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-200 hover:bg-gray-700'
            ]"
          >
            <div class="flex flex-col items-start">
              <span class="font-medium">{{ option.label }}</span>
              <span class="text-xs opacity-75">{{ option.resolution }}</span>
            </div>
            <svg
              v-if="selectedResolution.value === option.value"
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
          </button>
        </div>

        <div class="border-t border-gray-600 my-3"></div>

        <!-- Frame Rate Section -->
        <div class="text-xs font-medium text-gray-300 mb-2 px-2">Frame Rate</div>
        
        <div v-for="fps in fpsOptions" :key="fps.value" class="mb-1">
          <button
            @click="selectFPS(fps.value)"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
              selectedFPS === fps.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-200 hover:bg-gray-700'
            ]"
          >
            <div class="flex flex-col items-start">
              <span class="font-medium">{{ fps.label }}</span>
              <span class="text-xs opacity-75">{{ fps.description }}</span>
            </div>
            <svg
              v-if="selectedFPS === fps.value"
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
          </button>
        </div>

        <div class="border-t border-gray-600 my-3"></div>
        
        <!-- Audio Options Section -->
        <div class="px-2 mb-2">
          <div class="text-xs font-medium text-gray-300 mb-2">Audio Options</div>
          <label class="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              v-model="includeSystemAudio"
              class="rounded border-gray-500 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span>Include system audio</span>
          </label>
          <div class="text-xs text-gray-400 mt-1 ml-5">
            Share tab audio (requires browser support)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface ScreenShareQuality {
  value: string;
  label: string;
  resolution: string;
  width: number;
  height: number;
  frameRate: number;
}

export interface FPSOption {
  value: number;
  label: string;
  description: string;
}

interface Props {
  modelValue?: ScreenShareQuality;
  includeAudio?: boolean;
  selectedFPS?: number;
}

interface Emits {
  (e: 'update:modelValue', value: ScreenShareQuality): void;
  (e: 'update:includeAudio', value: boolean): void;
  (e: 'update:selectedFPS', value: number): void;
}

const resolutionOptions: Omit<ScreenShareQuality, 'frameRate'>[] = [
  {
    value: '4k',
    label: '4K Ultra',
    resolution: '3840×2160',
    width: 3840,
    height: 2160
  },
  {
    value: '1080p',
    label: '1080p HD',
    resolution: '1920×1080',
    width: 1920,
    height: 1080
  },
  {
    value: '720p',
    label: '720p',
    resolution: '1280×720',
    width: 1280,
    height: 720
  },
  {
    value: '480p',
    label: '480p',
    resolution: '854×480',
    width: 854,
    height: 480
  }
];

const fpsOptions: FPSOption[] = [
  {
    value: 15,
    label: '15 FPS',
    description: 'Low motion (saves bandwidth)'
  },
  {
    value: 20,
    label: '20 FPS',
    description: 'Text readability'
  },
  {
    value: 30,
    label: '30 FPS',
    description: 'Standard (recommended)'
  },
  {
    value: 60,
    label: '60 FPS',
    description: 'Gaming & smooth motion'
  }
];

const props = defineProps<Props>();

const emit = defineEmits<Emits>();

const showOptions = ref(false);

// Default to 1080p at 30 FPS
const defaultResolution = resolutionOptions[1]; // 1080p
const defaultFPS = 30;

const selectedResolution = computed({
  get: () => {
    if (props.modelValue) {
      return resolutionOptions.find(r => r.value === props.modelValue!.value) || defaultResolution;
    }
    return defaultResolution;
  },
  set: (value: Omit<ScreenShareQuality, 'frameRate'>) => {
    const quality: ScreenShareQuality = {
      ...value,
      frameRate: selectedFPS.value
    };
    emit('update:modelValue', quality);
  }
});

const selectedFPS = computed({
  get: () => props.selectedFPS ?? props.modelValue?.frameRate ?? defaultFPS,
  set: (value: number) => {
    emit('update:selectedFPS', value);
    // Also update the combined quality object
    const quality: ScreenShareQuality = {
      ...selectedResolution.value,
      frameRate: value
    };
    emit('update:modelValue', quality);
  }
});

const includeSystemAudio = computed({
  get: () => props.includeAudio || false,
  set: (value: boolean) => emit('update:includeAudio', value)
});

const selectResolution = (option: Omit<ScreenShareQuality, 'frameRate'>) => {
  selectedResolution.value = option;
};

const selectFPS = (fps: number) => {
  selectedFPS.value = fps;
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (showOptions.value && !(e.target as Element).closest('.relative')) {
    showOptions.value = false;
  }
});
</script>