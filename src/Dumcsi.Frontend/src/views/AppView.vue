<template>
  <div class="h-full flex bg-bg-base overflow-hidden">
    <ServerSidebar/>

    <div class="flex-1 flex overflow-hidden">
      <RouterView/>
    </div>

    <!-- Voice Control Bar (appears when connected to voice channel) -->
    <VoiceControlBar />
  </div>
</template>

<script setup lang="ts">
import {onMounted} from 'vue'
import {useAppStore} from '@/stores/app'
import {useLiveKitIntegration} from '@/composables/useLiveKitIntegration'
import ServerSidebar from '@/components/server/ServerSidebar.vue'
import VoiceControlBar from '@/components/voice/VoiceControlBar.vue'

const appStore = useAppStore()
// Initialize LiveKit integration
useLiveKitIntegration()

onMounted(async () => {
  // Load servers when app mounts
  await appStore.fetchServers()
})
</script>