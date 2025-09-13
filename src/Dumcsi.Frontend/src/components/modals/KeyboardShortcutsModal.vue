<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-bg-surface rounded-2xl shadow-2xl border border-border-default w-full max-w-4xl max-h-[80vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="p-6 border-b border-border-default flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-xl">
            <Keyboard class="w-6 h-6 text-primary"/>
          </div>
          <div>
            <h2 class="text-xl font-bold">{{ t('common.shortcuts.title') }}</h2>
            <p class="text-sm text-text-muted">{{ t('common.shortcuts.subtitle') }}</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-bg-hover rounded-lg transition-colors"
        >
          <X class="w-5 h-5"/>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="overflow-y-auto max-h-[calc(80vh-8rem)]">
        <!-- Platform Indicator -->
        <div class="p-6 border-b border-border-default bg-bg-base/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <Monitor class="w-5 h-5 text-text-muted"/>
              <span class="font-medium">{{ t('common.shortcuts.platform') }}</span>
              <span class="text-primary font-medium">{{ isMac ? t('common.platform.mac') : t('common.platform.windows') }}</span>
            </div>
            <div class="text-sm text-text-muted">
              {{ t('common.shortcuts.platformHint') }}
            </div>
          </div>
        </div>

        <!-- Categories -->
        <div class="p-6 space-y-8">
          <div v-for="category in categories" :key="category.id" class="space-y-4">
            <!-- Category Header -->
            <div class="flex items-center space-x-3 pb-3 border-b border-border-default">
              <component :is="getCategoryIcon(category.id)" class="w-5 h-5 text-primary"/>
              <h3 class="text-lg font-semibold">{{ category.name }}</h3>
            </div>

            <!-- Shortcuts Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div 
                v-for="binding in category.keybinds" 
                :key="binding.id"
                class="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-border-default hover:bg-bg-hover transition-colors"
              >
                <!-- Shortcut Info -->
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{{ binding.name }}</div>
                  <div class="text-xs text-text-muted truncate">{{ binding.description }}</div>
                </div>

                <!-- Keybind Display -->
                <div class="ml-4">
                  <kbd class="keybind-badge">
                    {{ getCurrentKey(binding) }}
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-border-default bg-bg-base/50">
          <div class="flex items-center justify-between text-sm text-text-muted">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <Info class="w-4 h-4"/>
                <span>{{ t('common.shortcuts.customizeHint') }}</span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span>{{ t('common.shortcuts.press') }}</span>
              <kbd class="keybind-badge text-xs">{{ isMac ? '⌘+/' : 'Ctrl+/' }}</kbd>
              <span>{{ t('common.shortcuts.toOpen') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Keyboard, 
  X, 
  Monitor, 
  Info,
  Navigation,
  Zap,
  MessageSquare,
  Server,
  Accessibility,
  Type
} from 'lucide-vue-next';
import type { KeyBindCategory } from '@/types/keybinds';
import { useKeyBinds } from '@/composables/useKeyBinds';
import { useI18n } from 'vue-i18n';

defineProps<{
  categories: KeyBindCategory[];
}>();

defineEmits<{
  close: [];
}>();

const { getCurrentKey, isMac } = useKeyBinds();
const { t } = useI18n();

// Get icon for category
const getCategoryIcon = (categoryId: string) => {
  const icons: Record<string, any> = {
    'general': Navigation,
    'main-functions': Zap,
    'message-navigation': MessageSquare,
    'server-channel': Server,
    'accessibility': Accessibility,
    'text-formatting': Type
  };
  return icons[categoryId] || Keyboard;
};
</script>

<style scoped>
@reference "@/style.css";

.keybind-badge {
  @apply inline-flex items-center px-2 py-1 bg-bg-surface border border-border-default rounded font-mono text-xs font-medium text-text-default;
  min-width: 2rem;
  text-align: center;
  white-space: nowrap;
}

/* Custom scrollbar for modal content */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-bg-base rounded-full;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  @apply bg-border-default rounded-full;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-text-muted;
}
</style>
