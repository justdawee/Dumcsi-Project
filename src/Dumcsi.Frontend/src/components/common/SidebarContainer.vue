<template>
  <div 
    :class="[
      'w-65 bg-main-950 flex flex-col overflow-hidden',
      appStore.currentVoiceChannelId ? 'h-[calc(100%-128px)]' : 'h-full'
    ]"
  >
    <!-- Header Section -->
    <div class="h-14 border-b border-l border-r border-border-default shadow-xs flex-shrink-0 flex items-center">
      <slot name="header" />
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto border-l border-r border-border-default shadow-xs scrollbar-thin min-h-0">
      <slot name="content" />
    </div>

    <!-- Optional Footer Slot -->
    <slot name="footer" />
  </div>
</template>

<script lang="ts" setup>
// VoiceControlPanel moved to AppView level
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>