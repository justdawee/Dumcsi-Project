<template>
  <div class="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
    <div class="text-center max-w-md px-4">
      <div class="w-32 h-32 bg-[var(--accent-primary)]/10 rounded-3xl mx-auto mb-6 flex items-center justify-center">
        <MessageSquarePlus class="w-16 h-16 text-[var(--accent-primary)]" />
      </div>
      
      <h1 class="text-3xl font-bold text-[var(--text-primary)] mb-4">
        Welcome to Dumcsi!
      </h1>
      
      <p class="text-lg text-[var(--text-secondary)] mb-8">
        {{ greeting }}
      </p>

      <div class="space-y-4">
        <button
          @click="appStore.showServerModal = true"
          class="w-full px-6 py-4 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors font-semibold flex items-center justify-center gap-3"
        >
          <Plus class="w-5 h-5" />
          Create a Server
        </button>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-[var(--bg-hover)]"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-[var(--bg-primary)] text-[var(--text-secondary)]">or</span>
          </div>
        </div>

        <button
          @click="showJoinModal = true"
          class="w-full px-6 py-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors font-semibold flex items-center justify-center gap-3"
        >
          <UserPlus class="w-5 h-5" />
          Join a Server
        </button>
      </div>

      <div v-if="appStore.servers.length > 0" class="mt-12">
        <p class="text-sm text-[var(--text-secondary)] mb-4">Your servers:</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="server in appStore.servers.slice(0, 4)"
            :key="server.id"
            @click="selectServer(server.id)"
            class="p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-left"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center flex-shrink-0">
                <img v-if="server.iconUrl" :src="server.iconUrl" alt="" class="w-full h-full rounded-xl object-cover" />
                <span v-else class="text-sm font-semibold text-[var(--text-primary)]">
                  {{ server.name.substring(0, 2).toUpperCase() }}
                </span>
              </div>
              <div class="min-w-0">
                <p class="font-medium text-[var(--text-primary)] truncate">{{ server.name }}</p>
                <p class="text-xs text-[var(--text-secondary)]">{{ server.memberCount }} members</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Join server modal -->
    <JoinServerModal v-if="showJoinModal" @close="showJoinModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessageSquarePlus, Plus, UserPlus } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import JoinServerModal from '@/components/modals/JoinServerModal.vue'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const showJoinModal = ref(false)

const greeting = computed(() => {
  if (!authStore.user) return 'Select a server to start chatting'
  
  const hour = new Date().getHours()
  const name = authStore.user.username
  
  if (hour < 12) return `Good morning, ${name}! Select a server to start chatting`
  if (hour < 18) return `Good afternoon, ${name}! Select a server to start chatting`
  return `Good evening, ${name}! Select a server to start chatting`
})

function selectServer(serverId: string) {
  router.push(`/servers/${serverId}`)
}
</script>