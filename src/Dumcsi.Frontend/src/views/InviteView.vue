<template>
  <div class="min-h-screen flex items-center justify-center bg-discord-gray-900 px-4">
    <div class="max-w-md w-full">
      <div v-if="loading" class="text-center">
        <Loader2 class="w-8 h-8 animate-spin text-discord-gray-400 mx-auto mb-4" />
        <p class="text-discord-gray-400">Loading invite...</p>
      </div>

      <div v-else-if="inviteInfo" class="bg-discord-gray-800 rounded-lg p-6 text-center">
        <div class="mb-6">
          <div v-if="inviteInfo.server.icon" class="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden">
            <img :src="inviteInfo.server.icon" :alt="inviteInfo.server.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-20 h-20 mx-auto mb-4 bg-discord-blurple rounded-full flex items-center justify-center">
            <span class="text-white font-bold text-2xl">{{ inviteInfo.server.name.charAt(0) }}</span>
          </div>
          
          <h1 class="text-2xl font-bold text-white mb-2">{{ inviteInfo.server.name }}</h1>
          <p v-if="inviteInfo.server.description" class="text-discord-gray-400 mb-2">
            {{ inviteInfo.server.description }}
          </p>
          <p class="text-discord-gray-400">{{ inviteInfo.server.memberCount }} members</p>
        </div>

        <BaseButton
          :loading="joining"
          @click="joinServer"
          full-width
          class="mb-4"
        >
          Join Server
        </BaseButton>

        <p class="text-sm text-discord-gray-400">
          Already have an account? 
          <router-link to="/app" class="text-discord-blurple hover:underline">
            Go to app
          </router-link>
        </p>
      </div>

      <div v-else class="bg-discord-gray-800 rounded-lg p-6 text-center">
        <XCircle class="w-16 h-16 text-discord-red mx-auto mb-4" />
        <h1 class="text-xl font-bold text-white mb-2">Invite Invalid</h1>
        <p class="text-discord-gray-400 mb-6">
          This invite link is invalid or has expired.
        </p>
        <BaseButton @click="$router.push('/app')" full-width>
          Go to App
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, XCircle } from 'lucide-vue-next'
import { inviteService } from '@/services/inviteService'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/common/BaseButton.vue'
import type { InviteInfoDto } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const { addToast } = useToast()

const loading = ref(true)
const joining = ref(false)
const inviteInfo = ref<InviteInfoDto | null>(null)

const loadInvite = async () => {
  try {
    const code = route.params.code as string
    inviteInfo.value = await inviteService.getInviteInfo(code)
  } catch (error) {
    console.error('Failed to load invite:', error)
  } finally {
    loading.value = false
  }
}

const joinServer = async () => {
  if (!inviteInfo.value) return

  try {
    joining.value = true
    const code = route.params.code as string
    await inviteService.useInvite(code)
    
    addToast({
      type: 'success',
      message: `Successfully joined ${inviteInfo.value.server.name}!`
    })
    
    // Refresh servers and navigate to the new server
    await appStore.fetchServers()
    router.push(`/app/servers/${inviteInfo.value.server.id}`)
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Failed to join server'
    })
  } finally {
    joining.value = false
  }
}

onMounted(loadInvite)
</script>