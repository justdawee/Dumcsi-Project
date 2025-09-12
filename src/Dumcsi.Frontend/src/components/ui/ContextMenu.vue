<template>
  <div
      v-if="visible"
      ref="contextMenu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      class="fixed z-[10000] bg-bg-base rounded-lg shadow-lg p-1.5 animate-fade-in border border-border-default/50 inline-block max-h-[80vh] overflow-auto overscroll-contain"
  >
    <ul class="space-y-1">
      <li v-for="(item, idx) in items" :key="idx" @mouseenter="onItemEnter(item, $event)" @mouseleave="onItemLeave">
        <div v-if="item.type === 'separator'" class="h-px bg-border-default/50 my-1" />
        <div v-else-if="item.type === 'label'" class="px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-tertiary select-none">
          {{ item.label }}
        </div>
        <button
          v-else
          :disabled="item.disabled"
          :class="[
            item.danger
              ? 'text-danger hover:bg-danger/20 hover:text-red-300'
              : 'text-text-secondary hover:bg-primary/50 hover:text-text-default',
            item.disabled ? 'opacity-50 cursor-not-allowed' : ''
          ]"
          class="flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors"
          @click="handleClick(item)"
        >
          <component v-if="item.checked" :is="Check" class="w-4 h-4 text-primary"/>
          <component v-else-if="item.icon" :is="item.icon" class="w-4 h-4"/>
          <span class="flex-1 text-left">{{ item.label }}</span>
          <span v-if="item.children && item.children.length" class="text-[10px] text-text-tertiary">▶</span>
          <span v-else-if="item.shortcut" class="text-[10px] text-text-tertiary">{{ item.shortcut }}</span>
        </button>
      </li>
    </ul>

    <!-- Submenu -->
    <div
      v-if="submenuVisible && submenuItems.length"
      class="fixed z-[10001] bg-bg-base rounded-lg shadow-lg p-1.5 border border-border-default/50 inline-block max-h-[80vh] overflow-auto overscroll-contain"
      :style="{ top: `${submenuY}px`, left: `${submenuX}px` }"
      @mouseenter="onSubmenuEnter"
      @mouseleave="onSubmenuLeave"
    >
      <ul class="space-y-1">
        <li v-for="(s, i) in submenuItems" :key="i">
          <div v-if="s.type === 'separator'" class="h-px bg-border-default/50 my-1" />
          <div v-else-if="s.type === 'label'" class="px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-tertiary select-none">
            {{ s.label }}
          </div>
          <button
            v-else
            :disabled="s.disabled"
            :class="[
              s.danger ? 'text-danger hover:bg-danger/20 hover:text-red-300' : 'text-text-secondary hover:bg-primary/50 hover:text-text-default',
              s.disabled ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors"
            @click="handleClick(s)"
          >
            <component v-if="s.checked" :is="Check" class="w-4 h-4 text-primary"/>
            <component v-else-if="s.icon" :is="s.icon" class="w-4 h-4"/>
            <span class="flex-1 text-left">{{ s.label }}</span>
            <span v-if="s.shortcut" class="text-[10px] text-text-tertiary">{{ s.shortcut }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onUnmounted} from 'vue';
import type {Component} from 'vue';
import { Check } from 'lucide-vue-next';
import {useContextMenuManager} from '@/composables/useContextMenuManager';

// --- Interface és Props ---
export interface MenuItem {
  // Common
  label?: string;
  type?: 'item' | 'separator' | 'label';
  // Clickable item props
  icon?: Component | null;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: string;
  // Nested submenu
  children?: MenuItem[];
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
const preferAboveHint = ref<boolean | null>(null);
const lastOpenX = ref<number | null>(null);
const lastOpenY = ref<number | null>(null);
let anchorEl: HTMLElement | null = null;
// Submenu state
const submenuVisible = ref(false);
const submenuItems = ref<MenuItem[]>([]);
const submenuX = ref(0);
const submenuY = ref(0);
let submenuCloseTimer: number | null = null;

// --- Manager ---
const {openMenu, closeMenu} = useContextMenuManager();

// --- Methods ---
const open = (event: MouseEvent) => {
  // Toggle behavior: if already visible at (about) same anchor, close; otherwise reposition
  if (visible.value) {
    const sameAnchor = lastOpenX.value !== null && lastOpenY.value !== null &&
      Math.abs(event.clientX - lastOpenX.value) < 3 && Math.abs(event.clientY - lastOpenY.value) < 3;
    if (sameAnchor) {
      close();
      return;
    }
  }
  const closeLogic = () => {
    visible.value = false;
    document.removeEventListener('click', handleClickOutside, true);
    hideSubmenu();
  };

  menuId.value = openMenu(closeLogic);
  visible.value = true;

  // positioning the context menu with viewport bounds checking
  x.value = event.clientX;
  y.value = event.clientY;
  lastOpenX.value = x.value;
  lastOpenY.value = y.value;
  anchorEl = (event.currentTarget as HTMLElement) || null;

  // Wait for the menu to render, then adjust position if needed
  setTimeout(() => {
    if (contextMenu.value) {
      const menuRect = contextMenu.value.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Prefer opening above the cursor when near bottom half (or explicit hint)
      const preferAbove = preferAboveHint.value ?? (event.clientY > viewportHeight / 2);
      const GAP = 6; // small gap above/below anchor

      // Horizontal: clamp within viewport with 10px margin
      if (x.value + menuRect.width > viewportWidth) {
        x.value = Math.max(10, viewportWidth - menuRect.width - 10);
      }
      if (x.value < 10) x.value = 10;

      // Vertical: flip above if preferred or if overflowing bottom
      if (preferAbove) {
        y.value = Math.max(10, event.clientY - menuRect.height - GAP);
      }
      if (y.value + menuRect.height > viewportHeight) {
        y.value = Math.max(10, viewportHeight - menuRect.height - GAP);
      }
      if (y.value < 10) y.value = 10;
    }
  }, 0);

  document.addEventListener('click', handleClickOutside, true);
};

// Open at explicit coordinates, optionally preferring above placement
const openAt = (xPos: number, yPos: number, preferAbove: boolean = false, gap: number = 6, anchor?: HTMLElement | null) => {
  // Toggle when clicking the same opener again; otherwise reposition
  if (visible.value) {
    const sameAnchor = lastOpenX.value !== null && lastOpenY.value !== null &&
      Math.abs(xPos - lastOpenX.value) < 3 && Math.abs(yPos - lastOpenY.value) < 3;
    if (sameAnchor) {
      close();
      return;
    }
  }
  const closeLogic = () => {
    visible.value = false;
    document.removeEventListener('click', handleClickOutside, true);
  };
  preferAboveHint.value = preferAbove;
  menuId.value = openMenu(closeLogic);
  visible.value = true;
  x.value = xPos;
  y.value = yPos;
  lastOpenX.value = xPos;
  lastOpenY.value = yPos;
  anchorEl = anchor || null;

  setTimeout(() => {
    if (contextMenu.value) {
      const menuRect = contextMenu.value.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const preferAboveLocal = preferAboveHint.value ?? (y.value > viewportHeight / 2);
      const GAP = gap;

      // Horizontal clamp
      if (x.value + menuRect.width > viewportWidth) {
        x.value = Math.max(10, viewportWidth - menuRect.width - 10);
      }
      if (x.value < 10) x.value = 10;

      // Place above anchor when requested
      if (preferAboveLocal) {
        y.value = Math.max(10, yPos - menuRect.height - GAP);
      }
      // Bottom clamp
      if (y.value + menuRect.height > viewportHeight) {
        y.value = Math.max(10, viewportHeight - menuRect.height - GAP);
      }
      if (y.value < 10) y.value = 10;
    }
  }, 0);

  document.addEventListener('click', handleClickOutside, true);
};

const close = () => {
  if (menuId.value !== null) {
    closeMenu(menuId.value);
    menuId.value = null;
  }
  preferAboveHint.value = null;
  lastOpenX.value = null;
  lastOpenY.value = null;
  anchorEl = null;
  hideSubmenu();
};

const handleClick = (item: MenuItem) => {
  if (item.disabled || item.type && item.type !== 'item') {
    close();
    return;
  }
  try { item.action && item.action(); } catch {}
  close();
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (contextMenu.value && !contextMenu.value.contains(target) && !(anchorEl && anchorEl.contains(target as Node))) {
    close();
  }
};

function onItemEnter(item: MenuItem, ev: MouseEvent) {
  if (submenuCloseTimer) { clearTimeout(submenuCloseTimer); submenuCloseTimer = null; }
  if (!item.children || item.children.length === 0) {
    hideSubmenu();
    return;
  }
  const btn = ev.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const GAP = 6;
  // Default to right side
  let sx = rect.right + GAP;
  let sy = rect.top;
  // Clamp to viewport
  // Measure an approximate width/height (fallbacks); we'll adjust after render
  const approxWidth = 220;
  const approxHeight = Math.min(300, viewportHeight - 20);
  if (sx + approxWidth > viewportWidth) {
    // Flip to left side
    sx = Math.max(10, rect.left - approxWidth - GAP);
  }
  if (sy + approxHeight > viewportHeight) {
    sy = Math.max(10, viewportHeight - approxHeight - GAP);
  }
  submenuItems.value = item.children || [];
  submenuX.value = sx;
  submenuY.value = sy;
  submenuVisible.value = true;
}

function onItemLeave() {
  // Delay closing to allow moving into submenu
  if (submenuCloseTimer) clearTimeout(submenuCloseTimer);
  submenuCloseTimer = setTimeout(() => hideSubmenu(), 200) as unknown as number;
}

function onSubmenuEnter() {
  if (submenuCloseTimer) { clearTimeout(submenuCloseTimer); submenuCloseTimer = null; }
}
function onSubmenuLeave() {
  if (submenuCloseTimer) clearTimeout(submenuCloseTimer);
  submenuCloseTimer = setTimeout(() => hideSubmenu(), 200) as unknown as number;
}

function hideSubmenu() {
  submenuVisible.value = false;
  submenuItems.value = [];
}

// --- Event Listeners ---
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});

defineExpose({
  open,
  openAt,
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
