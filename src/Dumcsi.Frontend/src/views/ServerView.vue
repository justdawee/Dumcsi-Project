<template>
  <div class="flex-1 flex h-full overflow-hidden">
    <!-- Channel Sidebar -->
    <ChannelSidebar 
      :server="appStore.currentServer"
      :loading="appStore.loading.server"
    />
    
    <!-- Channel Content or Server Welcome -->
    <div class="flex-1 bg-gray-800 overflow-hidden">
      <RouterView v-if="$route.params.channelId" />
      <ServerWelcome v-else :server="appStore.currentServer" />
    </div>
  </div>
</template>

<script setup>
import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ChannelSidebar from '@/components/channel/ChannelSidebar.vue'
import ServerWelcome from '@/components/server/ServerWelcome.vue'

const route = useRoute()
const appStore = useAppStore()

const loadServer = async (serverId) => {
  try {
    await appStore.fetchServer(serverId)
  } catch (error) {
    console.error('Failed to load server:', error)
  }
}

onMounted(() => {
  if (route.params.serverId) {
    loadServer(parseInt(route.params.serverId))
  }
})

watch(() => route.params.serverId, (newServerId) => {
  if (newServerId) {
    loadServer(parseInt(newServerId))
  }
})
</script>