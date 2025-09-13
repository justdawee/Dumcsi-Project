<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
            <Keyboard class="w-7 h-7 text-primary"/>
          </div>
          <div>
            <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.keybinds.title') }}</h1>
            <p class="mt-1 text-sm text-text-muted">{{ t('settings.keybinds.subtitle') }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <button
            @click="openShortcutsModal"
            class="flex items-center px-4 py-2 bg-bg-surface border border-border-default rounded-lg font-medium hover:bg-bg-hover transition-colors"
          >
            <HelpCircle class="w-4 h-4 mr-2"/>
            {{ t('settings.keybinds.viewAll') }}
          </button>
          <button
            @click="resetAllKeybinds"
            class="flex items-center px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors"
          >
            <RotateCcw class="w-4 h-4 mr-2"/>
            {{ t('settings.keybinds.resetAll') }}
          </button>
        </div>
      </header>

      <!-- Keybind Categories -->
      <div class="space-y-6">
        <div 
          v-for="category in keyBindCategories" 
          :key="category.id"
          class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden"
        >
          <!-- Category Header -->
          <div class="p-6 border-b border-border-default">
            <h2 class="text-lg font-semibold leading-6">{{ category.name }}</h2>
            <p class="mt-1 text-sm text-text-muted">{{ getCategoryDescription(category.id) }}</p>
          </div>

          <!-- Keybinds List -->
          <div class="divide-y divide-border-default">
            <div 
              v-for="binding in category.keybinds" 
              :key="binding.id"
              class="p-6 hover:bg-bg-hover/50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <!-- Binding Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-text-default">{{ binding.name }}</h3>
                  <p class="text-sm text-text-muted mt-1">{{ binding.description }}</p>
                </div>

                <!-- Keybind Display and Actions -->
                <div class="flex items-center space-x-3 ml-6">
                  <!-- Current Keybind Display -->
                  <div class="flex items-center space-x-2">
                    <kbd class="keybind-display">
                      {{ formatKeybindDisplay(binding) }}
                    </kbd>
                    <button
                      v-if="binding.currentKey"
                      @click="resetKeybind(binding.id)"
                      class="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                      :title="t('settings.keybinds.resetToDefault')"
                    >
                      <X class="w-4 h-4"/>
                    </button>
                  </div>

                  <!-- Edit Button -->
                  <button
                    @click="startRecording(binding.id)"
                    :disabled="isRecording && recordingBindingId !== binding.id"
                    :class="[
                      'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors',
                      isRecording && recordingBindingId === binding.id
                        ? 'bg-primary text-primary-text' 
                        : 'bg-bg-base border border-border-default hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed'
                    ]"
                  >
                    {{ isRecording && recordingBindingId === binding.id ? t('settings.keybinds.pressKey') : t('common.common.edit') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts Modal -->
    <KeyboardShortcutsModal 
      v-if="showShortcutsModal"
      :categories="keyBindCategories"
      @close="showShortcutsModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Keyboard, HelpCircle, RotateCcw, X } from 'lucide-vue-next';
import { useKeyBinds } from '@/composables/useKeyBinds';
import KeyboardShortcutsModal from '@/components/modals/KeyboardShortcutsModal.vue';
import { useI18n } from 'vue-i18n';

const { 
  keyBindCategories, 
  isRecording, 
  updateKeybind, 
  resetKeybind, 
  resetAllKeybinds, 
  recordKeybind, 
  getCurrentKey
} = useKeyBinds();

const { t } = useI18n();

const showShortcutsModal = ref(false);
const recordingBindingId = ref<string | null>(null);

// Category descriptions
const getCategoryDescription = (categoryId: string): string => {
  const descriptions: Record<string, string> = {
    'general': t('settings.keybinds.categoryDesc.general'),
    'main-functions': t('settings.keybinds.categoryDesc.mainFunctions'), 
    'message-navigation': t('settings.keybinds.categoryDesc.messageNavigation'),
    'server-channel': t('settings.keybinds.categoryDesc.serverChannel'),
    'accessibility': t('settings.keybinds.categoryDesc.accessibility'),
    'text-formatting': t('settings.keybinds.categoryDesc.textFormatting')
  };
  return descriptions[categoryId] || '';
};

// Format keybind for display
const formatKeybindDisplay = (binding: any): string => {
  const currentKey = getCurrentKey(binding);
  return currentKey;
};

// Start recording a new keybind
const startRecording = (bindingId: string) => {
  recordingBindingId.value = bindingId;
  recordKeybind((newKey: string) => {
    updateKeybind(bindingId, newKey);
    recordingBindingId.value = null;
  });
};

// Open shortcuts modal
const openShortcutsModal = () => {
  showShortcutsModal.value = true;
};
</script>

<style scoped>
@reference "@/style.css";

.keybind-display {
  @apply inline-flex items-center px-3 py-1.5 bg-bg-base border border-border-default rounded-lg font-mono text-sm font-medium text-text-default;
  min-width: 4rem;
  text-align: center;
  white-space: nowrap;
}

.keybind-display:empty::before {
  content: 'None';
  @apply text-text-muted italic;
}
</style>
