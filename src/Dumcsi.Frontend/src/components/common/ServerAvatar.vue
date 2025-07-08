<template>
  <div 
    class="w-12 h-12 rounded-3xl flex items-center justify-center text-white font-bold transition-all duration-200 hover:rounded-2xl overflow-hidden"
    :style="{ backgroundColor: (!iconUrl || imageError) ? backgroundColor : undefined }"
  >
    <img 
      v-if="iconUrl && !imageError" 
      :src="iconUrl" 
      :alt="displayName"
      class="w-full h-full object-cover"
      @error="handleImageError"
    />
    <span v-else class="text-lg">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(defineProps<{
  iconUrl?: string | null;
  name?: string | null;
  serverName?: string;
}>(), {
  name: '',
  serverName: ''
});

const imageError = ref(false);

// FIX: Biztonságos kezelés
const displayName = computed(() => {
  return props.name || props.serverName || 'Server';
});

const initials = computed(() => {
  const name = displayName.value;
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const backgroundColor = computed(() => {
  const name = displayName.value;
  if (!name) return '#374151'; // default gray
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
});

const handleImageError = () => {
  imageError.value = true;
};
</script>