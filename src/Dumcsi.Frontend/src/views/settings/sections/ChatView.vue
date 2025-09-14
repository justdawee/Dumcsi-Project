<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <MessageSquare class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sections.chat') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.chat.subtitle') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Actions / Reset -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 flex items-center justify-between">
            <div class="text-sm text-text-secondary">{{ t('settings.chat.subtitle') }}</div>
            <button class="btn-secondary btn-xs" @click="resetChat">{{ t('settings.chat.resetAll') }}</button>
          </div>
        </section>

        <!-- Formatting -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.chat.format.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.chat.format.description') }}</p>
          </div>
          <div class="p-5 space-y-3">
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.enableFormatting" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
              <span class="text-sm">{{ t('settings.chat.format.enableMarkdown') }}</span>
            </label>
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.showMediaPreviews" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
              <span class="text-sm">{{ t('settings.chat.format.mediaPreviews') }}</span>
            </label>
          </div>
        </section>

        <!-- Emoji -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.chat.emoji.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.chat.emoji.description') }}</p>
          </div>
          <div class="p-5 space-y-3">
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.bigEmojiOnly" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
              <span class="text-sm">{{ t('settings.chat.emoji.bigEmojiOnly') }}</span>
            </label>
          </div>
        </section>

        <!-- Display -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.chat.display.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.chat.display.description') }}</p>
          </div>
          <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-2">{{ t('settings.chat.display.density') }}</label>
              <div class="inline-flex rounded-lg border border-border-default overflow-hidden">
                <button type="button"
                        :class="chatSettings.density === 'cozy' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                        class="px-3 py-1.5 text-sm"
                        @click="chatSettings.density = 'cozy'">
                  {{ t('settings.chat.display.densityCozy') }}
                </button>
                <button type="button"
                        :class="chatSettings.density === 'compact' ? 'bg-primary text-white' : 'bg-bg-base text-text-secondary hover:bg-bg-base/70'"
                        class="px-3 py-1.5 text-sm border-l border-border-default"
                        @click="chatSettings.density = 'compact'">
                  {{ t('settings.chat.display.densityCompact') }}
                </button>
              </div>
            </div>
            <div class="space-y-3">
              <label class="flex items-center gap-3">
                <input type="checkbox"
                       v-model="chatSettings.showAvatars"
                       :disabled="chatSettings.density === 'compact'"
                       class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                <span class="text-sm">{{ t('settings.chat.display.showAvatars') }}</span>
                <span v-if="chatSettings.density === 'compact'" class="text-xs text-text-tertiary">— {{ t('settings.chat.display.avatarsDisabledInCompact') }}</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" v-model="chatSettings.showTimestamps" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
                <span class="text-sm">{{ t('settings.chat.display.showTimestamps') }}</span>
              </label>
            </div>
          </div>
        </section>

        <!-- Typing indicators -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.chat.typing.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.chat.typing.description') }}</p>
          </div>
          <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.showTypingIndicators" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
              <span class="text-sm">{{ t('settings.chat.typing.showIndicators') }}</span>
            </label>
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.sendTypingIndicators" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
              <span class="text-sm">{{ t('settings.chat.typing.sendIndicators') }}</span>
            </label>
          </div>
        </section>

        <!-- Live Preview -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">Preview</h2>
            <p class="text-xs text-text-tertiary mt-1">A quick look at how messages will appear with your current settings.</p>
          </div>
          <div class="p-5">
            <div :class="['rounded-lg border border-border-default bg-bg-base/60 p-3', chatSettings.density === 'compact' ? 'space-y-1.5' : 'space-y-4']">
              <div v-for="(m, i) in demoMessages" :key="i" class="flex items-start gap-3">
                <div v-if="showAvatarsPreview" class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">{{ m.initials }}</div>
                <div class="min-w-0">
                  <div class="flex items-baseline gap-2">
                    <span class="font-medium truncate">{{ m.author }}</span>
                    <span v-if="chatSettings.showTimestamps" class="text-[11px] text-text-tertiary">{{ formattedTime }}</span>
                  </div>
                  <div class="text-sm text-text-default">{{ m.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next';
import { computed, watch, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatSettings } from '@/composables/useChatSettings';

const { t, locale } = useI18n();
const { chatSettings, reset } = useChatSettings();

function resetChat() {
  reset();
}

const demoMessages = [
  { author: 'Alice', initials: 'A', text: 'Hey there! This is a sample message.' },
  { author: 'Bob', initials: 'B', text: 'Looks good! Compact mode tightens things nicely.' },
];

const formattedTime = computed(() => {
  try { return new Intl.DateTimeFormat(String((locale as any).value || 'en-US'), { timeStyle: 'short' }).format(new Date()); } catch { return '10:24'; }
});

// In compact mode, avatars are disabled
const showAvatarsPreview = computed(() => chatSettings.density === 'compact' ? false : chatSettings.showAvatars);

// Optionally enforce disabling avatars when switching to compact
const prevAvatars = ref(chatSettings.showAvatars);
watch(() => chatSettings.density, (d) => {
  if (d === 'compact') {
    prevAvatars.value = chatSettings.showAvatars;
    chatSettings.showAvatars = false;
  } else {
    // restore previous preference
    chatSettings.showAvatars = prevAvatars.value;
  }
});
</script>
