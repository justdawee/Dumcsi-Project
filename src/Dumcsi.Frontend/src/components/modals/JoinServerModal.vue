<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="emit('close')">
    <div class="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Join a Server</h2>
      <p class="text-[var(--text-secondary)] mb-6">Enter an invite code to join an existing server</p>

      <form @submit.prevent="handleJoin" class="space-y-4">
        <div>
          <label for="inviteCode" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Invite Code
          </label>
          <input
            id="inviteCode"
            v-model="inviteCode"
            type="text"
            required
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            placeholder="Enter invite code"
          />
          <p class="text-xs text-[var(--text-secondary)] mt-2">
            Invite codes look like ABC123 or dumcsi.app/invite/ABC123
          </p>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!inviteCode || isLoading"
            class="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
            Join Server
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { serverService } from '@/services/serverService'
import { useAppStore } from '@/stores/app'

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const appStore = useAppStore()
const inviteCode = ref('')
const isLoading = ref(false)

async function handleJoin() {
  if (!inviteCode.value) return

  // Extract code from URL if full URL is provided
  let code = inviteCode.value
  const match = code.match(/invite\/([A-Za-z0-9]+)/)
  if (match) {
    code = match[1]
  }

  isLoading.value = true
  try {
    const server = await serverService.joinServer(code)
    await appStore.loadServers()
    emit('close')
    router.push(`/servers/${server.id}`)
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    isLoading.value = false
  }
}
</script>