<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="emit('close')">
    <div class="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Invite friends to {{ appStore.currentServer?.name }}</h2>
      <p class="text-[var(--text-secondary)] mb-6">Share this invite link with others to grant access to your server</p>

      <div v-if="!inviteCode" class="space-y-4">
        <div>
          <label for="maxUses" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Max number of uses
          </label>
          <select
            id="maxUses"
            v-model.number="settings.maxUses"
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option :value="null">No limit</option>
            <option :value="1">1 use</option>
            <option :value="5">5 uses</option>
            <option :value="10">10 uses</option>
            <option :value="25">25 uses</option>
            <option :value="50">50 uses</option>
            <option :value="100">100 uses</option>
          </select>
        </div>

        <div>
          <label for="expiresIn" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Expire after
          </label>
          <select
            id="expiresIn"
            v-model.number="settings.expiresInHours"
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option :value="null">Never</option>
            <option :value="0.5">30 minutes</option>
            <option :value="1">1 hour</option>
            <option :value="6">6 hours</option>
            <option :value="12">12 hours</option>
            <option :value="24">1 day</option>
            <option :value="168">7 days</option>
          </select>
        </div>

        <button
          @click="generateInvite"
          :disabled="isLoading"
          class="w-full px-4 py-3 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2" />
          Generate Invite Link
        </button>
      </div>

      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Your invite link
          </label>
          <div class="flex gap-2">
            <input
              :value="inviteUrl"
              readonly
              class="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <button
              @click="copyInvite"
              class="px-4 py-3 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors flex items-center gap-2"
            >
              <Copy class="w-5 h-5" />
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <div class="text-sm text-[var(--text-secondary)]">
          <p v-if="settings.maxUses">This invite will expire after {{ settings.maxUses }} use{{ settings.maxUses > 1 ? 's' : '' }}.</p>
          <p v-if="settings.expiresInHours">This invite will expire in {{ formatExpiration(settings.expiresInHours) }}.</p>
        </div>

        <button
          @click="inviteCode = ''"
          class="w-full px-4 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
        >
          Generate New Link
        </button>
      </div>

      <div class="flex justify-end mt-6">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Copy, Loader2 } from 'lucide-vue-next'
import { serverService } from '@/services/serverService'
import { useAppStore } from '@/stores/app'

const emit = defineEmits<{
  close: []
}>()

const appStore = useAppStore()
const isLoading = ref(false)
const inviteCode = ref('')
const copied = ref(false)

const settings = reactive({
  maxUses: null as number | null,
  expiresInHours: null as number | null
})

const inviteUrl = computed(() => {
  return `${window.location.origin}/invite/${inviteCode.value}`
})

async function generateInvite() {
  if (!appStore.currentServer) return

  isLoading.value = true
  try {
    const invite = await serverService.createInvite({
      serverId: appStore.currentServer.id,
      maxUses: settings.maxUses,
      expiresInHours: settings.expiresInHours
    })
    inviteCode.value = invite.code
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    isLoading.value = false
  }
}

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
    appStore.showError('Invite link copied to clipboard!')
  } catch (error) {
    appStore.showError('Failed to copy invite link')
  }
}

function formatExpiration(hours: number): string {
  if (hours < 1) return `${hours * 60} minutes`
  if (hours === 1) return '1 hour'
  if (hours < 24) return `${hours} hours`
  if (hours === 24) return '1 day'
  return `${hours / 24} days`
}
</script>