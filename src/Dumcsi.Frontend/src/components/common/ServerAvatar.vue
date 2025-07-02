<template>
  <img
    v-if="showImage"
    :src="iconUrl!"
    class="w-full h-full object-cover"
    alt="Server Icon"
    @error="handleImageError"
  />
  <div
    v-else
    class="w-full h-full flex items-center justify-center font-bold bg-transparent"
  >
    <span class="text-xl text-current">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

// --- Props ---
const props = defineProps<{
  iconUrl?: string | null;
  serverName: string;
}>();

// --- State ---
const hasError = ref(false);

// --- Computed Properties ---
const showImage = computed(() => props.iconUrl && !hasError.value);

const initial = computed(() => {
  if (!props.serverName) return '?';
  return props.serverName.charAt(0).toUpperCase();
});

// --- Methods ---
const handleImageError = () => {
  hasError.value = true;
};
</script>
