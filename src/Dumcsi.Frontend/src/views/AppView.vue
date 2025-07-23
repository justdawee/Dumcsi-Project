<template>
  <div class="h-full flex bg-bg-base overflow-hidden">
    <ServerSidebar/>

    <div class="flex-1 flex overflow-hidden">
      <RouterView/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted} from 'vue'
import {useAppStore} from '@/stores/app'
import ServerSidebar from '@/components/server/ServerSidebar.vue'

const appStore = useAppStore()

onMounted(async () => {
  // Load servers when app mounts
  await appStore.fetchServers()
})
</script>