<template>
  <img
    v-if="showImage"
    :src="props.avatarUrl!"
    :class="['rounded-full object-cover', sizeClass]"
    alt="User Avatar"
    @error="handleImageError"
  />
  <div
    v-else
    :class="['rounded-full flex items-center justify-center shrink-0', colorClasses.bg, sizeClass]"
  >
  <span :class="['font-semibold', colorClasses.text, textSizeClass]">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

// --- Props ---
const props = withDefaults(defineProps<{
  avatarUrl?: string | null;
  username: string;
  size?: number;
}>(), {
  size: 40,
});

// --- State ---
const hasError = ref(false);

// --- Computed Properties ---

// Eldönti, hogy a képet kell-e mutatni.
const showImage = computed(() => props.avatarUrl && !hasError.value);

// Kiszámolja a felhasználó monogramját.
const initials = computed(() => {
  if (!props.username) return '??';
  const parts = props.username.split(/[ -]/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return props.username.substring(0, 2).toUpperCase();
});

// Dinamikusan generálja a méretet CSS osztályokkal.
const sizeClass = computed(() => `w-${props.size/4} h-${props.size/4}`); // pl. 40 -> w-10, 32 -> w-8
const textSizeClass = computed(() => {
    if (props.size >= 48) return 'text-xl';
    if (props.size >= 32) return 'text-sm';
    return 'text-xs';
});

const colorPalette = [
  // Eredeti színek
  { bg: 'bg-red-500/20', text: 'text-red-400' },
  { bg: 'bg-green-500/20', text: 'text-green-400' },
  { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  { bg: 'bg-lime-500/20', text: 'text-lime-400' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' },
  { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  { bg: 'bg-stone-500/20', text: 'text-stone-400' },
  { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  { bg: 'bg-gray-500/20', text: 'text-gray-400' },
];

const colorClasses = computed(() => {
  if (!props.username) return colorPalette[4]; // Alapértelmezett (indigo)
  let hash = 0;
  for (let i = 0; i < props.username.length; i++) {
    hash = props.username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colorPalette.length);
  return colorPalette[index];
});


// --- Methods ---
const handleImageError = () => {
  hasError.value = true;
};
</script>
