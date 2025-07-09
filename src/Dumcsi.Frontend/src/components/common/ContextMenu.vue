<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="visible"
        ref="menuRef"
        class="fixed bg-[var(--bg-secondary)] rounded-lg shadow-2xl py-2 min-w-[180px] z-[100] border border-[var(--bg-hover)]"
        :style="menuStyle"
        @click.stop
      >
        <div
          v-for="(item, index) in items"
          :key="index"
        >
          <div
            v-if="item.type === 'separator'"
            class="h-px bg-[var(--bg-hover)] my-2"
          />
          <button
            v-else
            @click="handleItemClick(item)"
            :disabled="item.disabled"
            :class="[
              'w-full px-3 py-2 text-left flex items-center gap-3 transition-colors',
              item.disabled
                ? 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                : item.danger
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            ]"
          >
            <component
              v-if="item.icon"
              :is="item.icon"
              class="w-4 h-4 flex-shrink-0"
            />
            <span class="flex-1">{{ item.label }}</span>
            <span
              v-if="item.shortcut"
              class="text-xs text-[var(--text-secondary)] ml-auto"
            >
              {{ item.shortcut }}
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Component } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: Component
  action?: () => void
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  type?: 'item' | 'separator'
}

interface Props {
  modelValue: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const menuRef = ref<HTMLElement>()
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const menuStyle = computed(() => {
  const padding = 10
  const x = props.x
  const y = props.y
  
  // This will be adjusted after the menu is rendered
  return {
    left: `${x}px`,
    top: `${y}px`
  }
})

function handleItemClick(item: ContextMenuItem) {
  if (item.disabled || !item.action) return
  
  item.action()
  visible.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    visible.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    visible.value = false
  }
}

// Adjust menu position to prevent overflow
watch(visible, async (newVal) => {
  if (newVal && menuRef.value) {
    await nextTick()
    
    const rect = menuRef.value.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const padding = 10
    
    let x = props.x
    let y = props.y
    
    // Adjust horizontal position
    if (x + rect.width + padding > windowWidth) {
      x = windowWidth - rect.width - padding
    }
    
    // Adjust vertical position
    if (y + rect.height + padding > windowHeight) {
      y = windowHeight - rect.height - padding
    }
    
    menuRef.value.style.left = `${x}px`
    menuRef.value.style.top = `${y}px`
  }
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>