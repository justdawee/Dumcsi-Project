<template>
  <div class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Loading state -->
      <div v-if="isLoading" class="text-center">
        <Loader2 class="w-12 h-12 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
        <p class="text-[var(--text-secondary)]">Loading invite...</p>
      </div>

      <!-- Invite details -->
      <div v-else-if="invite" class="bg-[var(--bg-secondary)] rounded-2xl p-8 shadow-xl">
        <div class="text-center mb-6">
          <div class="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <img v-if="invite.server.iconUrl" :src="invite.server.iconUrl" alt="" class="w-full h-full rounded-2xl object-cover" />
            <span v-else class="text-2xl font-bold text-[var(--text-primary)]">
              {{ invite.server.name.substring(0, 2).toUpperCase() }}
            </span>
          </div>
          
          <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-2">
            You've been invited to join
          </h2>
          <h3 class="text-xl text-[var(--text-primary)]">{{ invite.server.name }}</h3>
          
          <div class="flex items-center justify-center gap-4 mt-4 text-sm text-[var(--text-secondary)]">
            <span class="flex items-center gap-1">
              <Users class="w-4 h-4" />
              {{ invite.server.memberCount }} members
            </span>
            <span class="flex items-center gap-1">
              <User class="w-4 h-4" />
              Invited by {{ invite.inviter.username }}
            </span>
          </div>

          <p v-if="invite.server.description" class="mt-4 text-[var(--text-secondary)]">
            {{ invite.server.description }}
          </p>
        </div>

        <div class="space-y-3">
          <button
            @click="joinServer"
            :disabled="isJoining"
            class="w-full px-4 py-3 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Loader2 v-if="isJoining" class="w-5 h-5 animate-spin mr-2" />
            {{ isJoining ? 'Joining...' : 'Accept Invite' }}
          </button>

          <button
            @click="goHome"
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
          >
            No Thanks
          </button>
        </div>
      </div>

      <!-- Error state -->
      <div v-else class="bg-[var(--bg-secondary)] rounded-2xl p-8 shadow-xl text-center">
        <div class="w-20 h-20 bg-red-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <AlertCircle class="w-10 h-10 text-red-500" />
        </div>
        <h2 class="text-xl font-bold text-[var(--text-primary)] mb-2">Invalid Invite</h2>
        <p class="text-[var(--text-secondary)] mb-6">
          This invite may be expired or you might not have permission to join.
        </p>
        <button
          @click="goHome"
          class="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, Users, User, AlertCircle } from 'lucide-vue-next'
import { serverService } from '@/services/serverService'
import { useAppStore } from '@/stores/app'
import type { Invite } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const isLoading = ref(true)
const isJoining = ref(false)
const invite = ref<Invite | null>(null)

onMounted(async () => {
  const code = route.params.code as string
  if (!code) {
    router.push('/')
    return
  }

  try {
    // In a real app, we'd have an endpoint to get invite details
    // For now, we'll try to join directly
    isLoading.value = false
  } catch (error) {
    isLoading.value = false
  }
})

async function joinServer() {
  const code = route.params.code as string
  if (!code) return

  isJoining.value = true
  try {
    const server = await serverService.joinServer(code)
    await appStore.loadServers()
    router.push(`/servers/${server.id}`)
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    isJoining.value = false
  }
}

function goHome() {
  router.push('/')
}
</script>