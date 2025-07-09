<template>
  <div class="flex flex-1">
    <!-- Channel Sidebar -->
    <div class="w-60 bg-discord-gray-800 flex flex-col">
      <!-- Server Header -->
      <div class="px-4 py-3 border-b border-discord-gray-700">
        <h1 class="text-white font-semibold text-lg truncate">
          {{ currentServer?.name }}
        </h1>
      </div>

      <!-- Channels -->
      <div class="flex-1 overflow-y-auto p-2">
        <div v-for="channel in textChannels" :key="channel.id" class="mb-1">
          <button
            :class="[
              'w-full flex items-center px-2 py-1 rounded channel-hover text-left',
              currentChannelId === channel.id ? 'bg-discord-gray-600 text-white' : 'text-discord-gray-300'
            ]"
            @click="navigateToChannel(channel.id)"
          >
            <Hash class="w-4 h-4 mr-2" />
            <span class="truncate">{{ channel.name }}</span>
          </button>
        </div>

        <div v-if="voiceChannels.length > 0" class="mt-4">
          <h3 class="text-discord-gray-400 text-xs font-semibold uppercase tracking-wide px-2 mb-2">
            Voice Channels
          </h3>
          <div v-for="channel in voiceChannels" :key="channel.id" class="mb-1">
            <button
              class="w-full flex items-center px-2 py-1 rounded channel-hover text-left text-discord-gray-300"
              @click="joinVoiceChannel(channel.id)"
            >
              <Volume2 class="w-4 h-4 mr-2" />
              <span class="truncate">{{ channel.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- User Area -->
      <div class="px-2 py-2 border-t border-discord-gray-700">
        <div class="flex items-center space-x-2">
          <UserAvatar
            :src="currentUser?.avatar"
            :username="currentUser?.username"
            size="sm"
            :status="'online'"
            show-status
          />
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">
              {{ currentUser?.username }}
            </p>
          </div>
          <button
            class="p-1 text-discord-gray-400 hover:text-white transition-colors"
            @click="$router.push('/app/settings/profile')"
          >
            <Settings class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <router-view />

    <!-- Member List -->
    <div v-if="showMemberList" class="w-60 bg-discord-gray-800">
      <div class="p-4">
        <h3 class="text-discord-gray-400 text-xs font-semibold uppercase tracking-wide mb-4">
          Members — {{ members.length }}
        </h3>
        <div class="space-y-2">
          <div v-for="member in members" :key="member.userId" class="flex items-center space-x-2">
            <UserAvatar
              :src="member.avatar"
              :username="member.username"
              size="sm"
              :status="isUserOnline(member.userId) ? 'online' : 'offline'"
              show-status
            />
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">
                {{ member.serverNickname || member.username }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Hash, Volume2, Settings } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { ChannelType, type EntityId } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const { addToast } = useToast()

const currentServer = computed(() => appStore.currentServer)
const members = computed(() => appStore.members)
const currentUser = computed(() => authStore.currentUser)
const currentChannelId = computed(() => {
  const channelId = route.params.channelId
  return channelId ? parseInt(channelId as string, 10) : null
})

const textChannels = computed(() => 
  currentServer.value?.channels.filter(c => c.type === ChannelType.Text) || []
)

const voiceChannels = computed(() => 
  currentServer.value?.channels.filter(c => c.type === ChannelType.Voice) || []
)

const showMemberList = computed(() => !!currentChannelId.value)

const isUserOnline = (userId: EntityId): boolean => {
  return appStore.onlineUsers.has(userId)
}

const navigateToChannel = (channelId: EntityId) => {
  const serverId = route.params.serverId
  router.push(`/app/servers/${serverId}/channels/${channelId}`)
}

const joinVoiceChannel = async (channelId: EntityId) => {
  try {
    // Voice channel functionality would be implemented here
    addToast({
      type: 'info',
      message: 'Voice channels are not yet implemented'
    })
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to join voice channel'
    })
  }
}

watch(() => route.params.serverId, async (newServerId) => {
  if (newServerId) {
    const serverId = parseInt(newServerId as string, 10)
    try {
      await appStore.fetchServer(serverId)
    } catch (error) {
      addToast({
        type: 'danger',
        message: 'Failed to load server'
      })
      router.push('/app')
    }
  }
}, { immediate: true })

onMounted(() => {
  // Auto-navigate to first channel if none selected
  if (currentServer.value && !currentChannelId.value && textChannels.value.length > 0) {
    navigateToChannel(textChannels.value[0].id)
  }
})
</script>