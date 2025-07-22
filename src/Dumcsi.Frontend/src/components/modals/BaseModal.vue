<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
          v-if="modelValue"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-bg-base/80 backdrop-blur-sm"
            @click="handleBackdropClick"
        />

        <!-- Modal Content -->
        <div
            ref="modalContent"
            :class="[
            'relative bg-bg-surface rounded-lg shadow-xl max-h-[90vh] flex flex-col border border-border-default/50',
            sizeClasses
          ]"
            @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-6 pb-4 border-b border-border-default">
            <h2 class="text-xl font-semibold text-text-default">{{ title }}</h2>
            <button
                :aria-label="closeLabel"
                class="p-1 hover:bg-main-700 rounded-lg transition"
                @click="close"
            >
              <X class="w-5 h-5 text-text-muted"/>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <slot/>
          </div>

          <!-- Footer (optional) -->
          <div v-if="$slots.footer" class="p-6 pt-4 border-t border-border-default">
            <slot name="footer"/>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {ref, computed, watch, onMounted, onUnmounted} from 'vue';
import {X} from 'lucide-vue-next';

// Props
const props = withDefaults(defineProps<{
  modelValue?: boolean;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
}>(), {
  modelValue: true,
  size: 'md',
  closeOnBackdrop: true,
  closeOnEscape: true,
  closeLabel: 'Close modal'
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

// State
const modalContent = ref<HTMLElement>();

// Computed
const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-lg',
    lg: 'w-full max-w-2xl',
    xl: 'w-full max-w-4xl',
    full: 'w-full max-w-7xl'
  };
  return sizes[props.size];
});

// Methods
const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close();
  }
};

const handleEscape = (event: KeyboardEvent) => {
  if (props.closeOnEscape && event.key === 'Escape') {
    close();
  }
};

const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.overflow = '';
};

// Focus trap
const trapFocus = (event: KeyboardEvent) => {
  if (!modalContent.value || event.key !== 'Tab') return;

  const focusableElements = modalContent.value.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
  );
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (event.shiftKey && document.activeElement === firstFocusable) {
    event.preventDefault();
    lastFocusable?.focus();
  } else if (!event.shiftKey && document.activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable?.focus();
  }
};

// Lifecycle
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', trapFocus);
    lockBodyScroll();
  } else {
    document.removeEventListener('keydown', handleEscape);
    document.removeEventListener('keydown', trapFocus);
    unlockBodyScroll();
  }
});

onMounted(() => {
  if (props.modelValue) {
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', trapFocus);
    lockBodyScroll();
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.removeEventListener('keydown', trapFocus);
  unlockBodyScroll();
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>