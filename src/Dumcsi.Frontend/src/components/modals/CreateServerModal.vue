<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="emit('close')">
    <div class="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Create a Server</h2>
      <p class="text-[var(--text-secondary)] mb-6">Give your new server a personality with a name and an icon. You can always change it later.</p>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label for="serverName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Server Name
          </label>
          <input
            id="serverName"
            v-model="form.name"
            type="text"
            required
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            placeholder="My Awesome Server"
          />
        </div>

        <div>
          <label for="serverDescription" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Description (optional)
          </label>
          <textarea
            id="serverDescription"
            v-model="form.description"
            rows="3"
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none"
            placeholder="What's your server about?"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Server Icon (optional)
          </label>
          <div class="flex items-center space-x-4">
            <div class="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center overflow-hidden">
              <img v-if="form.iconUrl" :src="form.iconUrl" alt="Server icon" class="w-full h-full object-cover" />
              <ImageIcon v-else class="w-8 h-8 text-[var(--text-secondary)]" />
            </div>
            <input
              v-model="form.iconUrl"
              type="url"
              class="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              placeholder="https://example.com/icon.png"
            />
          </div>
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
            :disabled="!form.name || isLoading"
            class="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
            Create Server
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ImageIcon, Loader2 } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

const emit = defineEmits<{
  close: []
}>()

const appStore = useAppStore()
const isLoading = ref(false)

const form = reactive({
  name: '',
  description: '',
  iconUrl: ''
})

async function handleCreate() {
  if (!form.name) return

  isLoading.value = true
  try {
    await appStore.createServer(form.name, form.description || undefined, form.iconUrl || undefined)
    emit('close')
  } catch (error) {
    // Error handled by app store
  } finally {
    isLoading.value = false
  }
}
</script>