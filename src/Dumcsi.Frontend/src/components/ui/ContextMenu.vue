<template>
  <div
      v-if="visible"
      ref="contextMenu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      class="fixed z-50 bg-bg-base rounded-lg shadow-lg p-1.5 animate-fade-in border border-border-default/50"
  >
    <ul class="space-y-1">
      <li v-for="item in items" :key="item.label">
        <button
            :class="item.danger
            ? 'text-danger hover:bg-danger/20 hover:text-red-300'
            : 'text-text-secondary hover:bg-primary/50 hover:text-text-default'"
            class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors"
            @click="handleClick(item)"
        >
          <component :is="item.icon" class="w-4 h-4"/>
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import {ref, onUnmounted} from 'vue';
import type {Component} from 'vue';
import {useContextMenuManager} from '@/composables/useContextMenuManager';

// --- Interface és Props ---
export interface MenuItem {
  label: string;
  icon: Component;
  action: () => void;
  danger?: boolean;
}

defineProps<{
  items: MenuItem[];
}>();

// --- State ---
const visible = ref(false);
const x = ref(0);
const y = ref(0);
const contextMenu = ref<HTMLElement | null>(null);
const menuId = ref<number | null>(null);

// --- Manager ---
const {openMenu, closeMenu} = useContextMenuManager();

// --- Methods ---
const open = (event: MouseEvent) => {
  const closeLogic = () => {
    visible.value = false;
    document.removeEventListener('click', handleClickOutside, true);
  };

  menuId.value = openMenu(closeLogic);
  visible.value = true;

  // positioning the context menu
  x.value = event.clientX;
  y.value = event.clientY;

  document.addEventListener('click', handleClickOutside, true);
};

const close = () => {
  if (menuId.value !== null) {
    closeMenu(menuId.value);
    menuId.value = null;
  }
};

const handleClick = (item: MenuItem) => {
  item.action();
  close();
};

const handleClickOutside = (event: MouseEvent) => {
  if (contextMenu.value && !contextMenu.value.contains(event.target as Node)) {
    close();
  }
};

// --- Event Listeners ---
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});

defineExpose({
  open,
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.1s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>