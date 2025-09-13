<template>
  <div class="flex items-center gap-1 p-1 my-2 bg-bg-surface/50 rounded-lg border-b border-bg-surface">
    <!-- Formatting buttons -->
    <button
        v-for="action in formattingActions"
        :key="action.name"
        :title="action.title"
        class="p-1.5 text-text-muted hover:text-text-default hover:bg-bg-surface rounded transition-colors"
        @click="action.handler"
    >
      <component :is="action.icon" class="w-4 h-4" />
    </button>

    <div class="w-px h-5 bg-bg-surface mx-1" />

    <!-- Special formatting -->
    <button
        v-for="special in specialActions"
        :key="special.name"
        :title="special.title"
        class="p-1.5 text-text-muted hover:text-text-default hover:bg-bg-surface rounded transition-colors"
        @click="special.handler"
    >
      <component :is="special.icon" class="w-4 h-4" />
    </button>

    <div class="flex-1" />

    <!-- Preview toggle -->
    <button
        :class="[
        'px-2 py-1 text-xs rounded transition-colors',
        showPreview
          ? 'bg-primary/20 text-primary'
          : 'text-text-muted hover:text-text-default hover:bg-bg-surface'
      ]"
        @click="$emit('toggle-preview')"
    >
      {{ showPreview ? t('chat.toolbar.edit') : t('chat.toolbar.preview') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Quote,
  EyeOff
} from 'lucide-vue-next';

defineProps<{
  showPreview: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-preview'): void;
  (e: 'format', format: string, prefix: string, suffix?: string): void;
  (e: 'insert', text: string): void;
}>();

const { t } = useI18n();

const formattingActions = [
  {
    name: 'bold',
    title: t('chat.toolbar.bold'),
    icon: Bold,
    handler: () => emit('format', 'bold', '**', '**')
  },
  {
    name: 'italic',
    title: t('chat.toolbar.italic'),
    icon: Italic,
    handler: () => emit('format', 'italic', '*', '*')
  },
  {
    name: 'strikethrough',
    title: t('chat.toolbar.strikethrough'),
    icon: Strikethrough,
    handler: () => emit('format', 'strikethrough', '~~', '~~')
  },
  {
    name: 'code',
    title: t('chat.toolbar.code'),
    icon: Code,
    handler: () => emit('format', 'code', '`', '`')
  }
];

const specialActions = [
  {
    name: 'quote',
    title: t('chat.toolbar.quote'),
    icon: Quote,
    handler: () => emit('format', 'quote', '> ')
  },
  {
    name: 'link',
    title: t('chat.toolbar.link'),
    icon: Link,
    handler: () => {
      const url = prompt(t('chat.input.promptUrl'));
      if (url) {
        emit('format', 'link', '[', `](${url})`);
      }
    }
  },
  {
    name: 'spoiler',
    title: t('chat.toolbar.spoiler'),
    icon: EyeOff,
    handler: () => emit('format', 'spoiler', '||', '||')
  }
];
</script>
