<template>
  <div class="h-full flex bg-bg-base overflow-hidden relative">
    <ServerSidebar/>

    <div class="flex-1 flex overflow-hidden">
      <RouterView/>
    </div>

    <!-- Voice Control Panel at app level to span across ServerSidebar and content -->
    <VoiceControlPanel />
    
    <!-- UserInfoPanel at app level to span across ServerSidebar and content -->
    <UserInfoPanel />
  </div>
</template>

<script setup lang="ts">
import {onMounted} from 'vue'
import {useAppStore} from '@/stores/app'
import {useLiveKitIntegration} from '@/composables/useLiveKitIntegration'
import ServerSidebar from '@/components/server/ServerSidebar.vue'
import VoiceControlPanel from '@/components/voice/VoiceControlPanel.vue'
import UserInfoPanel from '@/components/common/UserInfoPanel.vue'

const appStore = useAppStore()
// Initialize LiveKit integration
useLiveKitIntegration()

onMounted(async () => {
  // Load servers when app mounts
  await appStore.fetchServers()
})
</script>