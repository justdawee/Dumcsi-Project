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
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted} from 'vue'
import { useRoute } from 'vue-router'
import { RouteNames } from '@/router'
import {useAppStore} from '@/stores/app'
import {useLiveKitIntegration} from '@/composables/useLiveKitIntegration'
import ServerSidebar from '@/components/server/ServerSidebar.vue'
import VoiceControlPanel from '@/components/voice/VoiceControlPanel.vue'
import UserInfoPanel from '@/components/common/UserInfoPanel.vue'

const appStore = useAppStore()
// Initialize LiveKit integration
useLiveKitIntegration()

const route = useRoute()
const hideChrome = computed(() => route.name === RouteNames.SETTINGS)

onMounted(async () => {
  // Load servers when app mounts
  await appStore.fetchServers()
})
</script>
