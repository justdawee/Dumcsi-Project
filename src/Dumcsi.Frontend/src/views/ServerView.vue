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

    <!-- Create Channel Modal -->
    <CreateChannelModal
      v-if="appStore.isCreateChannelModalOpen"
      :server-id="appStore.createChannelForServerId"
      @close="appStore.closeCreateChannelModal"
      @channel-created="handleChannelCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ChannelSidebar from '@/components/channel/ChannelSidebar.vue'
import ServerWelcome from '@/components/server/ServerWelcome.vue'
import CreateChannelModal from '@/components/channel/CreateChannelModal.vue';

const route = useRoute()
const appStore = useAppStore()

const loadServer = async (serverId: number) => {
  try {
    await appStore.fetchServer(serverId);
  } catch (error) {
    console.error('Failed to load server:', error);
    // Itt lehetne navigálni egy hiba oldalra vagy hibaüzenetet mutatni
  }
};

const handleChannelCreated = () => {
    if (appStore.createChannelForServerId) {
        appStore.fetchServer(appStore.createChannelForServerId);
    }
}

onMounted(() => {
  const serverId = parseInt(route.params.serverId as string, 10);
  if (serverId) {
    loadServer(serverId);
  }
});

watch(() => route.params.serverId, (newServerId) => {
  if (newServerId) {
    loadServer(parseInt(newServerId as string, 10));
  }
});
</script>