<template>
  <div
    v-if="visible"
    ref="contextMenu"
    class="fixed z-50 bg-gray-900 rounded-lg shadow-lg p-1.5 animate-fade-in border border-gray-700/50"
    :style="{ top: `${y}px`, left: `${x}px` }"
  >
    <ul class="space-y-1">
      <li v-for="item in items" :key="item.label">
        <button
          @click="handleClick(item)"
          class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors"
          :class="item.danger 
            ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' 
            : 'text-gray-300 hover:bg-primary/50 hover:text-white'"
        >
          <component :is="item.icon" class="w-4 h-4" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Component } from 'vue';

// --- Interface és Props ---
// Ez az interfész definiálja, milyen adatokat vár egy menüpont
export interface MenuItem {
  label: string;
  icon: Component;
  action: () => void;
  danger?: boolean;
}

defineProps<{
  items: MenuItem[];
}>();

// --- State a pozícióhoz és láthatósághoz ---
const visible = ref(false);
const x = ref(0);
const y = ref(0);
const contextMenu = ref<HTMLElement | null>(null);

// --- Metódusok ---
const open = (event: MouseEvent) => {
  visible.value = true;
  
  // Pozícionálás, hogy ne lógjon ki a képernyőről (opcionális, de ajánlott)
  const menuWidth = 180; // A menü becsült szélessége
  if (event.clientX + menuWidth > window.innerWidth) {
    x.value = event.clientX - menuWidth;
  } else {
    x.value = event.clientX;
  }
  y.value = event.clientY;
};

const close = () => {
  visible.value = false;
};

const handleClick = (item: MenuItem) => {
  item.action();
  close();
};

// A menün kívülre kattintva bezárjuk azt
const handleClickOutside = (event: MouseEvent) => {
  if (contextMenu.value && !contextMenu.value.contains(event.target as Node)) {
    close();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});

// Az 'open' metódust elérhetővé tesszük a szülő komponens számára
defineExpose({
  open,
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.1s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>