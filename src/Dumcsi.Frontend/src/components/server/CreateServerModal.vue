<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md animate-fade-in">
      <h2 class="text-2xl font-bold text-white mb-6">Create or Join Server</h2>
      
      <!-- Tab Selection -->
      <div class="flex mb-6 bg-gray-900 rounded-lg p-1">
        <button
          @click="activeTab = 'create'"
          :class="['flex-1 py-2 px-4 rounded-md font-medium transition', 
                   activeTab === 'create' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white']"
        >
          Create Server
        </button>
        <button
          @click="activeTab = 'join'"
          :class="['flex-1 py-2 px-4 rounded-md font-medium transition', 
                   activeTab === 'join' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white']"
        >
          Join Server
        </button>
      </div>

      <!-- Create Server Tab -->
      <form v-if="activeTab === 'create'" @submit.prevent="handleCreateServer" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Server Name
          </label>
          <input
            v-model="createForm.name"
            type="text"
            required
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
            placeholder="My Awesome Server"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            v-model="createForm.description"
            rows="3"
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder="What's your server about?"
          />
        </div>
        
        <div class="flex items-center">
          <input
            id="isPublic"
            v-model="createForm.isPublic"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded-sm focus:ring-primary/50"
          />
          <label for="isPublic" class="ml-2 text-sm text-gray-300">
            Make server public
          </label>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 btn-primary"
          >
            Create Server
          </button>
        </div>
      </form>

      <!-- Join Server Tab -->
      <form v-else @submit.prevent="handleJoinServer" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Invite Code
          </label>
          <input
            v-model="joinForm.inviteCode"
            type="text"
            required
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/50 uppercase"
            placeholder="ABCD1234"
            maxlength="8"
          />
        </div>
        
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 btn-primary"
          >
            Join Server
          </button>
        </div>
      </form>
      
      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const emit = defineEmits(['close'])
const router = useRouter()
const appStore = useAppStore()

const activeTab = ref('create')
const loading = ref(false)
const error = ref('')

const createForm = ref({
  name: '',
  description: '',
  isPublic: false
})

const joinForm = ref({
  inviteCode: ''
})

const handleCreateServer = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await appStore.createServer(createForm.value)
    emit('close')
    router.push(`/servers/${response.serverId}`)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create server'
  } finally {
    loading.value = false
  }
}

const handleJoinServer = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // For now, we'll need to implement a way to get server ID from invite code
    // This would require an additional API endpoint
    error.value = 'Join server functionality coming soon!'
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to join server'
  } finally {
    loading.value = false
  }
}
</script>