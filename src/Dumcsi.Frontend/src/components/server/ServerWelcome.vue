<template>
  <div class="flex-1 flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      <div class="w-32 h-32 mx-auto mb-6 bg-gray-700 rounded-full flex items-center justify-center">
        <MessageSquare class="w-16 h-16 text-gray-500" />
      </div>
      <h1 class="text-3xl font-bold text-white mb-3">
        Welcome to {{ server?.name }}!
      </h1>
      <p class="text-gray-400 mb-6">
        {{ server?.description || 'Select a channel from the sidebar to start chatting.' }}
      </p>
      
      <div v-if="server?.channels?.length > 0" class="space-y-2">
        <p class="text-sm text-gray-500 mb-3">Quick jump to:</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <RouterLink
            v-for="channel in server.channels.slice(0, 5)"
            :key="channel.id"
            :to="`/servers/${server.id}/channels/${channel.id}`"
            class="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm text-gray-300 hover:text-white transition"
          >
            <Hash class="w-3 h-3" />
            {{ channel.name }}
          </RouterLink>
        </div>
      </div>
      
      <div v-if="canInvite" class="mt-8">
        <button
          @click="handleGenerateInvite"
          :disabled="generatingInvite"
          class="btn-primary inline-flex items-center gap-2"
        >
          <UserPlus class="w-5 h-5" />
          Generate Invite Link
        </button>
        
        <div v-if="inviteCode" class="mt-4 p-4 bg-gray-700 rounded-lg">
          <p class="text-sm text-gray-400 mb-2">Share this invite code:</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 px-3 py-2 bg-gray-800 rounded-sm text-primary font-mono">
              {{ inviteCode }}
            </code>
            <button
              @click="copyInviteCode"
              class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-sm transition"
            >
              <Copy class="w-4 h-4" />
            </button>
          </div>
          <p v-if="copied" class="text-xs text-green-400 mt-2">Copied!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MessageSquare, Hash, UserPlus, Copy } from 'lucide-vue-next'
import serverService from '@/services/serverService'

const props = defineProps({
  server: Object
})

const inviteCode = ref('')
const generatingInvite = ref(false)
const copied = ref(false)

const canInvite = computed(() => props.server?.currentUserRole > 0)

const handleGenerateInvite = async () => {
  generatingInvite.value = true
  try {
    const response = await serverService.generateInvite(props.server.id)
    inviteCode.value = response.data.inviteCode
  } catch (error) {
    console.error('Failed to generate invite:', error)
  } finally {
    generatingInvite.value = false
  }
}

const copyInviteCode = async () => {
  try {
    await navigator.clipboard.writeText(inviteCode.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}
</script>