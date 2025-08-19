
<template>
  <div class="flex-1 flex h-full overflow-hidden">
    <!-- Channel Sidebar -->
    <ChannelSidebar
        :loading="appStore.loading.server"
        :server="appStore.currentServer"
    />

    <!-- Channel Content or Server Welcome -->
    <div class="flex-1 bg-bg-base overflow-hidden">
      <RouterView v-if="$route.params.channelId"/>
      <ServerWelcome v-else :server="appStore.currentServer"/>
    </div>

    <!-- Create Channel Modal -->
    <CreateChannelModal
        v-if="appStore.isCreateChannelModalOpen"
        :server-id="appStore.createChannelForServerId as number"
        @close="appStore.closeCreateChannelModal"
        @channel-created="handleChannelCreated"
    />
  </div>
</template>

<script lang="ts" setup>
import {watch, onMounted, onUnmounted} from 'vue'
import {useRoute} from 'vue-router'
import {useAppStore} from '@/stores/app'
import {signalRService} from '@/services/signalrService'
import {getVoiceSession, isSessionFresh} from '@/services/voiceSession'
import ChannelSidebar from '@/components/channel/ChannelSidebar.vue'
import ServerWelcome from '@/components/server/ServerWelcome.vue'
import CreateChannelModal from '@/components/channel/CreateChannelModal.vue';

const route = useRoute()
const appStore = useAppStore()

// Load server data when the component is mounted or when the serverId changes
const loadServer = async (serverId: number) => {
  const previousId = appStore.currentServer?.id;
  if (signalRService.isConnected && previousId && previousId !== serverId) {
    await signalRService.leaveServer(previousId);
  }

  try {
    await appStore.fetchServer(serverId);
  } catch (error) {
    console.error('Failed to load server:', error);
  }

  if (signalRService.isConnected) {
    await signalRService.joinServer(serverId);
  }

  // Attempt auto-reconnect to voice channel for a short window after refresh
  try {
    const session = getVoiceSession();
    if (
      session &&
      session.serverId === serverId &&
      isSessionFresh(session) &&
      !appStore.currentVoiceChannelId
    ) {
      await appStore.joinVoiceChannel(session.channelId);
    }
  } catch {}
};

// Handle channel creation event
const handleChannelCreated = () => {
  if (appStore.createChannelForServerId) {
    appStore.fetchServer(appStore.createChannelForServerId);
  }
}

// Load server data on initial mount
onMounted(() => {
  const serverId = parseInt(route.params.serverId as string, 10);
  if (serverId) {
    loadServer(serverId);
  }
});

// Leave the server when the component is unmounted
onUnmounted(() => {
  const id = appStore.currentServer?.id;
  if (id && signalRService.isConnected) {
    signalRService.leaveServer(id);
  }
});

// Watch for changes in the serverId route parameter and load the server accordingly
watch(() => route.params.serverId, (newServerId) => {
  const id = newServerId ? parseInt(newServerId as string, 10) : null;
  if (id) {
    loadServer(id);
  }
});
</script>
