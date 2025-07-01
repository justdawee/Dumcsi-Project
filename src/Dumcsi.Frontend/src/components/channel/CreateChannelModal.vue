<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md animate-fade-in">
      <h2 class="text-xl font-bold text-white mb-4">Create Channel</h2>
      
      <form @submit.prevent="handleCreateChannel" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Channel Type
          </label>
          <div class="flex gap-3">
            <label class="flex-1">
              <input
                v-model="form.type"
                type="radio"
                :value="0"
                class="sr-only"
              />
              <div class="channel-type-option" :class="{ active: form.type === 0 }">
                <Hash class="w-5 h-5" />
                <span>Text</span>
              </div>
            </label>
            <label class="flex-1">
              <input
                v-model="form.type"
                type="radio"
                :value="1"
                class="sr-only"
              />
              <div class="channel-type-option" :class="{ active: form.type === 1 }">
                <Volume2 class="w-5 h-5" />
                <span>Voice</span>
              </div>
            </label>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Channel Name
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
            placeholder="new-channel"
            pattern="[a-z0-9-]+"
            @input="form.name = form.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')"
          />
          <p class="mt-1 text-xs text-gray-400">
            Channel names must be lowercase with no spaces
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Description (optional)
          </label>
          <input
            v-model="form.description"
            type="text"
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
            placeholder="What's this channel about?"
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
            :disabled="loading || !form.name"
            class="flex-1 btn-primary"
          >
            Create Channel
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
import { Hash, Volume2 } from 'lucide-vue-next'

const props = defineProps({
  serverId: Number
})

const emit = defineEmits(['close'])
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const error = ref('')

const form = ref({
  name: '',
  description: '',
  type: 0 // 0 = Text, 1 = Voice
})

const handleCreateChannel = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await appStore.createChannel(props.serverId, form.value)
    emit('close')
    
    // Navigate to the new channel if it's a text channel
    if (form.value.type === 0) {
      router.push(`/servers/${props.serverId}/channels/${response.id}`)
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create channel'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@reference "@/style.css";

.channel-type-option {
  @apply flex items-center justify-center gap-2 p-3 bg-gray-700 border-2 border-gray-600 
         rounded-lg cursor-pointer transition-all hover:border-gray-500;
}

.channel-type-option.active {
  @apply bg-primary/20 border-primary text-primary;
}
</style>