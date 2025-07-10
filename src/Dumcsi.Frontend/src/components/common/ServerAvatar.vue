<template>
  <div
      class="w-12 h-12 rounded-3xl flex items-center justify-center text-white font-bold transition-all duration-200 hover:rounded-2xl overflow-hidden"
      :style="{ backgroundColor: (!icon || imageError) ? backgroundColor : undefined }"
  >
    <img
        v-if="icon && !imageError"
        :src="icon"
        :alt="displayName"
        class="w-full h-full object-cover"
        @error="handleImageError"
    />
    <span v-else class="text-lg">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';

const props = withDefaults(defineProps<{
  icon?: string | null;
  name?: string | null;
  serverName?: string;
  serverId?: number | null;
}>(), {
  name: '',
  serverName: ''
});

const imageError = ref(false);

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

// --- SZÍNGENERÁLÓ SEGÉDFÜGGVÉNYEK ---
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let z = Math.imul(t ^ (t >>> 15), 1 | t);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h/60)%2 - 1));
  const m = l - c/2;
  let [r, g, b] = [0,0,0];
  if      (h <  60) [r,g,b] = [c,x,0];
  else if (h < 120) [r,g,b] = [x,c,0];
  else if (h < 180) [r,g,b] = [0,c,x];
  else if (h < 240) [r,g,b] = [0,x,c];
  else if (h < 300) [r,g,b] = [x,0,c];
  else              [r,g,b] = [c,0,x];
  const toHex = (v: number) => {
    const h = Math.round((v + m)*255).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const backgroundColor = computed(() => {
  if (!props.serverId) return '#374151';

  // létrehozzuk a PRNG-t a serverId‑ból
  const prng = mulberry32(props.serverId);

  // húzzuk ki a H, S, L értékeket
  const h = Math.floor(prng() * 360);            // 0–359°
  const s = Math.floor(50 + prng() * 25);        // 50–75%
  const l = Math.floor(35 + prng() * 40);        // 35–75%

  return hslToHex(h, s, l);
});

const handleImageError = () => {
  imageError.value = true;
};
</script>