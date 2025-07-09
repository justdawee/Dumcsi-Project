<template>
  <div class="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
    <!-- Server list sidebar -->
    <div class="w-[72px] bg-[var(--bg-secondary)] flex flex-col items-center py-3 space-y-2 flex-shrink-0">
      <!-- Home/DMs button -->
      <button
        @click="goHome"
        :class="[
          'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200',
          isHome ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        ]"
      >
        <Home class="w-6 h-6" />
      </button>

      <div class="w-8 h-[2px] bg-[var(--bg-hover)] rounded-full" />

      <!-- Server list -->
      <div class="flex-1 w-full overflow-y-auto scrollbar-hide space-y-2">
        <button
          v-for="server in appStore.sortedServers"
          :key="server.id"
          @click="selectServer(server.id)"
          :class="[
            'relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 mx-auto',
            currentServerId === server.id
              ? 'bg-[var(--accent-primary)]/20 ring-2 ring-[var(--accent-primary)]'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]'
          ]"
        >
          <img
            v-if="server.iconUrl"
            :src="server.iconUrl"
            :alt="server.name"
            class="w-10 h-10 rounded-2xl object-cover"
          />
          <span v-else class="text-[var(--text-primary)] font-semibold">
            {{ server.name.substring(0, 2).toUpperCase() }}
          </span>
          
          <!-- Notification indicator -->
          <span v-if="server.unreadCount" class="absolute -top-1 -right-1 bg-[var(--accent-secondary)] text-xs text-white w-5 h-5 rounded-full flex items-center justify-center">
            {{ server.unreadCount > 99 ? '99+' : server.unreadCount }}
          </span>
        </button>
      </div>

      <!-- Add server button -->
      <button
        @click="appStore.showServerModal = true"
        class="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white flex items-center justify-center transition-all duration-200"
      >
        <Plus class="w-6 h-6" />
      </button>

      <div class="w-8 h-[2px] bg-[var(--bg-hover)] rounded-full" />

      <!-- User settings -->
      <button
        @click="goToSettings"
        class="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all duration-200"
      >
        <Settings class="w-6 h-6" />
      </button>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex">
      <router-view />
    </div>

    <!-- Modals -->
    <CreateServerModal v-if="appStore.showServerModal" @close="appStore.showServerModal = false" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Plus, Settings } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import CreateServerModal from '@/components/modals/CreateServerModal.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const currentServerId = computed(() => route.params.serverId as string | undefined)
const isHome = computed(() => !currentServerId.value && route.name !== 'settings')

function goHome() {
  router.push('/')
}

function selectServer(serverId: string) {
  router.push(`/servers/${serverId}`)
}

function goToSettings() {
  router.push('/settings')
}
</script>