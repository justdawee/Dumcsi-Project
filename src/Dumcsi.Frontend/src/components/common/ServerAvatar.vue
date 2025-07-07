<template>
  <div 
    :class="[
      'relative flex items-center justify-center bg-gray-700 text-white font-semibold overflow-hidden',
      sizeClasses,
      className
    ]"
    :style="{ backgroundColor: !iconUrl ? serverColor : undefined }"
  >
    <img 
      v-if="iconUrl" 
      :src="iconUrl" 
      :alt="name"
      class="w-full h-full object-cover"
      @error="handleImageError"
    />
    <span v-else :class="textSizeClass">
      {{ initials }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Props
const props = withDefaults(defineProps<{
  iconUrl?: string | null;
  name: string;
  size?: number;
  serverId?: number;
  className?: string;
}>(), {
  size: 48,
  className: 'rounded-2xl'
});

// State
const imageError = ref(false);

// Computed
const sizeClasses = computed(() => {
  const sizeMap: Record<number, string> = {
    32: 'w-8 h-8',
    40: 'w-10 h-10',
    48: 'w-12 h-12',
    64: 'w-16 h-16',
    80: 'w-20 h-20',
    128: 'w-32 h-32'
  };
  return sizeMap[props.size] || `w-[${props.size}px] h-[${props.size}px]`;
});

const textSizeClass = computed(() => {
  if (props.size <= 32) return 'text-xs';
  if (props.size <= 48) return 'text-sm';
  if (props.size <= 64) return 'text-base';
  if (props.size <= 80) return 'text-lg';
  return 'text-2xl';
});

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return props.name.substring(0, 2).toUpperCase();
});

const serverColor = computed(() => {
  // Generate color based on server name or ID
  const seed = props.serverId || props.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    '#7c3aed', // purple
    '#2563eb', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#ec4899', // pink
    '#f97316', // orange
  ];
  return colors[seed % colors.length];
});

// Methods
const handleImageError = () => {
  imageError.value = true;
};</script>