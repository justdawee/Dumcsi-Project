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
        <!-- Formatting -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.chat.format.title') }}</h2>
            <p class="text-xs text-text-tertiary mt-1">{{ t('settings.chat.format.description') }}</p>
          </div>
          <div class="p-5 space-y-3">
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.enableFormatting" />
              <span class="text-sm">{{ t('settings.chat.format.enableMarkdown') }}</span>
            </label>
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.showMediaPreviews" />
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
              <input type="checkbox" v-model="chatSettings.bigEmojiOnly" />
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
          <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('settings.chat.display.density') }}</label>
              <select v-model="chatSettings.density" class="form-input w-full max-w-xs">
                <option value="cozy">{{ t('settings.chat.display.densityCozy') }}</option>
                <option value="compact">{{ t('settings.chat.display.densityCompact') }}</option>
              </select>
            </div>
            <div class="space-y-3">
              <label class="flex items-center gap-3">
                <input type="checkbox" v-model="chatSettings.showAvatars" />
                <span class="text-sm">{{ t('settings.chat.display.showAvatars') }}</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" v-model="chatSettings.showTimestamps" />
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
          <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.showTypingIndicators" />
              <span class="text-sm">{{ t('settings.chat.typing.showIndicators') }}</span>
            </label>
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="chatSettings.sendTypingIndicators" />
              <span class="text-sm">{{ t('settings.chat.typing.sendIndicators') }}</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useChatSettings } from '@/composables/useChatSettings';

const { t } = useI18n();
const { chatSettings } = useChatSettings();
</script>
