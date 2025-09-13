<template>
  <div class="volume-control-container relative" @mouseleave="hideSlider">
    <!-- Volume Button -->
    <button
      @mouseenter="showSlider"
      @click="toggleMute"
      :class="[
        'w-8 h-8 rounded hover:bg-black/20 flex items-center justify-center transition-colors',
        volume === 0 ? 'text-red-400' : 'text-white'
      ]"
      :title="getVolumeTooltip()"
    >
      <VolumeX v-if="volume === 0" class="w-4 h-4" />
      <Volume1 v-else-if="volume <= 0.5" class="w-4 h-4" />
      <Volume2 v-else class="w-4 h-4" />
    </button>

    <!-- Volume Slider (appears on hover) -->
    <div
      v-show="sliderVisible"
      @mouseenter="showSlider"
      class="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-4 min-w-[40px] flex flex-col items-center gap-2"
    >
      <!-- Volume Percentage Display -->
      <div class="text-white text-xs font-medium min-w-[32px] text-center">
        {{ Math.round(volume * 100) }}%
      </div>
      
      <!-- Vertical Slider -->
      <div class="relative h-24 w-1.5">
        <!-- Slider Track -->
        <div class="absolute inset-0 bg-gray-600 rounded-full"></div>
        
        <!-- Slider Fill -->
        <div 
          class="absolute bottom-0 left-0 right-0 bg-white rounded-full"
          :style="{ height: (volume * 100) + '%' }"
        ></div>
        
        <!-- Slider Handle -->
        <div
          class="absolute left-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg cursor-pointer transform -translate-x-1/2 translate-y-1/2 hover:scale-110 transition-transform"
          :style="{ bottom: (volume * 100) + '%' }"
          @mousedown="startDragging"
        ></div>
        
        <!-- Invisible interaction area for easier clicking -->
        <div
          class="absolute inset-0 w-7 h-24 -ml-3 cursor-pointer"
          @click="handleTrackClick"
          @mousedown="startDragging"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Volume1, Volume2, VolumeX } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  volume: number; // 0.0 to 1.0 (0% to 100%)
  userId: number;
  username: string;
}

interface Emits {
  (e: 'volumeChange', volume: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const sliderVisible = ref(false);
const isDragging = ref(false);
const lastNonZeroVolume = ref(1.0);
const { t } = useI18n();

// Keep track of last non-zero volume for mute toggle
if (props.volume > 0) {
  lastNonZeroVolume.value = props.volume;
}

let sliderHideTimeout: number;

const showSlider = () => {
  clearTimeout(sliderHideTimeout);
  sliderVisible.value = true;
};

const hideSlider = () => {
  if (!isDragging.value) {
    sliderHideTimeout = setTimeout(() => {
      sliderVisible.value = false;
    }, 300);
  }
};

const setVolume = (volume: number) => {
  if (volume > 0) {
    lastNonZeroVolume.value = volume;
  }
  emit('volumeChange', volume);
};

const toggleMute = () => {
  if (props.volume === 0) {
    // Unmute: restore to last non-zero volume
    setVolume(lastNonZeroVolume.value);
  } else {
    // Mute: set to 0 but remember current volume
    lastNonZeroVolume.value = props.volume;
    setVolume(0);
  }
};

const handleTrackClick = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  if (!target) return;
  
  const rect = target.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;
  // Invert y because slider is bottom-to-top
  const normalizedY = (height - y) / height;
  const newVolume = Math.max(0, Math.min(1, normalizedY));
  setVolume(newVolume);
};

const startDragging = (event: MouseEvent) => {
  isDragging.value = true;
  showSlider();
  
  // Store the slider container reference at the start
  const sliderContainer = (event.currentTarget as HTMLElement)?.closest('.h-24') as HTMLElement;
  if (!sliderContainer) {
    console.warn('Could not find slider container');
    return;
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!sliderContainer) return;
    
    const rect = sliderContainer.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    // Invert y because slider is bottom-to-top  
    const normalizedY = (height - y) / height;
    const newVolume = Math.max(0, Math.min(1, normalizedY));
    setVolume(newVolume);
  };
  
  const handleMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    // Hide slider after a delay when dragging stops
    hideSlider();
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Prevent default to avoid text selection
  event.preventDefault();
};

const getVolumeTooltip = () => {
  const percentage = Math.round(props.volume * 100);
  if (percentage === 0) {
    return t('voice.volume.tooltipMuted', { username: props.username });
  }
  return t('voice.volume.tooltipPercent', { username: props.username, percent: percentage });
};
</script>

<style scoped>
.volume-control-container {
  /* Ensure the component has proper z-index for overlay */
  z-index: 10;
}
</style>
