<template>
  <div class="h-full flex bg-bg-base overflow-hidden relative">
    <ServerSidebar v-if="!hideChrome"/>

    <div class="flex-1 flex overflow-hidden">
      <RouterView/>
    </div>

    <!-- Voice Control Panel at app level to span across ServerSidebar and content -->
    <VoiceControlPanel v-if="!hideChrome" />
    
    <!-- UserInfoPanel at app level to span across ServerSidebar and content -->
    <UserInfoPanel v-if="!hideChrome" />

    <!-- Global Keyboard Shortcuts Modal -->
    <KeyboardShortcutsModal 
      v-if="showKeyboardShortcuts"
      :categories="keyBindCategories"
      @close="showKeyboardShortcuts = false"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import { useRoute } from 'vue-router'
import { RouteNames } from '@/router'
import {useAppStore} from '@/stores/app'
import {useLiveKitIntegration} from '@/composables/useLiveKitIntegration'
import {useKeyBinds} from '@/composables/useKeyBinds'
import {useVoiceSettings} from '@/composables/useVoiceSettings'
import ServerSidebar from '@/components/server/ServerSidebar.vue'
import VoiceControlPanel from '@/components/voice/VoiceControlPanel.vue'
import UserInfoPanel from '@/components/common/UserInfoPanel.vue'
import KeyboardShortcutsModal from '@/components/modals/KeyboardShortcutsModal.vue'

const appStore = useAppStore()
// Initialize LiveKit integration
useLiveKitIntegration()
// Initialize keyboard shortcuts
const { keyBindCategories } = useKeyBinds()
// Initialize voice settings (including push-to-talk)
useVoiceSettings()

const route = useRoute()
const hideChrome = computed(() => route.name === RouteNames.SETTINGS)
const showKeyboardShortcuts = ref(false)

// Listen for keyboard shortcuts modal event
const handleOpenKeyboardShortcuts = () => {
  showKeyboardShortcuts.value = true
}

onMounted(async () => {
  // Load servers when app mounts
  await appStore.fetchServers()
  
  // Add global event listener for keyboard shortcuts modal
  window.addEventListener('openKeyboardShortcuts', handleOpenKeyboardShortcuts)
})

onUnmounted(() => {
  window.removeEventListener('openKeyboardShortcuts', handleOpenKeyboardShortcuts)
})
</script>
