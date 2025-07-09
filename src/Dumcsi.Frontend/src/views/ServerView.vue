<template>
  <div class="flex-1 flex">
    <!-- Channel sidebar -->
    <div class="w-60 bg-[var(--bg-secondary)] flex flex-col">
      <!-- Server header -->
      <div class="h-14 px-4 flex items-center justify-between border-b border-[var(--bg-hover)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
           @click="showServerMenu = !showServerMenu">
        <h2 class="font-semibold text-[var(--text-primary)] truncate">
          {{ appStore.currentServer?.name }}
        </h2>
        <ChevronDown :class="['w-5 h-5 text-[var(--text-secondary)] transition-transform', showServerMenu && 'rotate-180']" />
      </div>

      <!-- Server menu dropdown -->
      <Transition name="slide-down">
        <div v-if="showServerMenu" class="absolute top-14 left-[72px] w-60 bg-[var(--bg-tertiary)] rounded-lg shadow-xl py-2 z-20">
          <button
            @click="appStore.showInviteModal = true"
            class="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
          >
            <UserPlus class="w-4 h-4" />
            Invite People
          </button>
          <button
            v-if="isServerOwner"
            @click="showServerSettings = true"
            class="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
          >
            <Settings class="w-4 h-4" />
            Server Settings
          </button>
          <button
            @click="appStore.showChannelModal = true"
            class="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
          >
            <Hash class="w-4 h-4" />
            Create Channel
          </button>
          <div class="h-px bg-[var(--bg-hover)] my-2" />
          <button
            @click="handleLeaveServer"
            class="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3"
          >
            <LogOut class="w-4 h-4" />
            Leave Server
          </button>
        </div>
      </Transition>

      <!-- Channel list -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div v-for="channelType in channelTypes" :key="channelType" class="mb-4">
          <div v-if="getChannelsByType(channelType).length > 0" class="mb-2">
            <h3 class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide px-2">
              {{ channelType }} Channels
            </h3>
          </div>
          
          <div class="space-y-1">
            <button
              v-for="channel in getChannelsByType(channelType)"
              :key="channel.id"
              @click="selectChannel(channel.id)"
              :class="[
                'w-full px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors group',
                appStore.currentChannel?.id === channel.id
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]/50 hover:text-[var(--text-primary)]'
              ]"
            >
              <Hash v-if="channel.type === 'Text'" class="w-4 h-4 flex-shrink-0" />
              <Volume2 v-else-if="channel.type === 'Voice'" class="w-4 h-4 flex-shrink-0" />
              <Megaphone v-else class="w-4 h-4 flex-shrink-0" />
              
              <span class="truncate flex-1 text-left">{{ channel.name }}</span>
              
              <span v-if="channel.unreadCount" class="bg-[var(--accent-secondary)] text-xs text-white px-1.5 py-0.5 rounded-full">
                {{ channel.unreadCount }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- User panel -->
      <div class="h-14 px-2 flex items-center bg-[var(--bg-tertiary)]">
        <button
          @click="showUserMenu = !showUserMenu"
          class="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        >
          <UserAvatar :user="authStore.user!" :size="32" :showOnlineStatus="false" />
          <div class="flex-1 text-left">
            <p class="text-sm font-medium text-[var(--text-primary)] truncate">
              {{ authStore.user?.username }}
            </p>
            <p class="text-xs text-[var(--text-secondary)]">
              {{ authStore.user?.status || 'Click to set status' }}
            </p>
          </div>
        </button>
        
        <button
          @click="appStore.toggleTheme"
          class="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
        >
          <Sun v-if="appStore.theme === 'dark'" class="w-5 h-5" />
          <Moon v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Main content area -->
    <div class="flex-1 flex">
      <router-view v-if="appStore.currentChannel" />
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <Hash class="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4 opacity-20" />
          <p class="text-[var(--text-secondary)]">Select a channel to start chatting</p>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CreateChannelModal v-if="appStore.showChannelModal" @close="appStore.showChannelModal = false" />
    <InviteModal v-if="appStore.showInviteModal" @close="appStore.showInviteModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, Hash, Volume2, Megaphone, UserPlus, Settings, LogOut, Sun, Moon } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { ChannelType } from '@/types'
import UserAvatar from '@/components/common/UserAvatar.vue'
import CreateChannelModal from '@/components/modals/CreateChannelModal.vue'
import InviteModal from '@/components/modals/InviteModal.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const showServerMenu = ref(false)
const showUserMenu = ref(false)
const showServerSettings = ref(false)

const channelTypes: ChannelType[] = ['Text', 'Voice', 'Announcement']

const isServerOwner = computed(() => {
  return appStore.currentServer?.ownerId === authStore.user?.id
})

function getChannelsByType(type: ChannelType) {
  if (!appStore.currentServer) return []
  return appStore.currentServer.channels
    .filter(c => c.type === type)
    .sort((a, b) => a.position - b.position)
}

function selectChannel(channelId: string) {
  router.push(`/servers/${route.params.serverId}/channels/${channelId}`)
}

async function handleLeaveServer() {
  if (!appStore.currentServer) return
  
  if (confirm(`Are you sure you want to leave ${appStore.currentServer.name}?`)) {
    try {
      await appStore.leaveServer(appStore.currentServer.id)
      router.push('/')
    } catch (error) {
      // Error handled by store
    }
  }
}

// Load server data
onMounted(async () => {
  const serverId = route.params.serverId as string
  if (serverId) {
    await appStore.selectServer(serverId)
  }
})

// Watch for server changes
watch(() => route.params.serverId, async (newServerId) => {
  if (newServerId && typeof newServerId === 'string') {
    await appStore.selectServer(newServerId)
  }
})

// Watch for channel changes
watch(() => route.params.channelId, async (newChannelId) => {
  if (newChannelId && typeof newChannelId === 'string') {
    await appStore.selectChannel(newChannelId)
  }
})
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>