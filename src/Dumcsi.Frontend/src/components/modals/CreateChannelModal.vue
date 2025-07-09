<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="emit('close')">
    <div class="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Create Channel</h2>
      <p class="text-[var(--text-secondary)] mb-6">in {{ appStore.currentServer?.name }}</p>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Channel Type
          </label>
          <div class="space-y-2">
            <label
              v-for="type in channelTypes"
              :key="type.value"
              class="flex items-center p-3 bg-[var(--bg-tertiary)] rounded-xl cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <input
                v-model="form.type"
                type="radio"
                :value="type.value"
                class="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-primary)] border-gray-600"
              />
              <div class="ml-3 flex items-center gap-3 flex-1">
                <component :is="type.icon" class="w-5 h-5 text-[var(--text-secondary)]" />
                <div>
                  <p class="font-medium text-[var(--text-primary)]">{{ type.label }}</p>
                  <p class="text-xs text-[var(--text-secondary)]">{{ type.description }}</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label for="channelName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Channel Name
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <Hash v-if="form.type === 'Text'" class="w-5 h-5" />
              <Volume2 v-else-if="form.type === 'Voice'" class="w-5 h-5" />
              <Megaphone v-else class="w-5 h-5" />
            </span>
            <input
              id="channelName"
              v-model="form.name"
              type="text"
              required
              class="w-full pl-10 pr-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              placeholder="new-channel"
            />
          </div>
        </div>

        <div>
          <label for="channelDescription" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Description (optional)
          </label>
          <textarea
            id="channelDescription"
            v-model="form.description"
            rows="2"
            class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none"
            placeholder="What's this channel about?"
          />
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
            Create Channel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Hash, Volume2, Megaphone, Loader2 } from 'lucide-vue-next'
import { channelService } from '@/services/channelService'
import { useAppStore } from '@/stores/app'
import { ChannelType } from '@/types'

const emit = defineEmits<{
  close: []
}>()

const appStore = useAppStore()
const isLoading = ref(false)

const channelTypes = [
  {
    value: 'Text' as ChannelType,
    label: 'Text Channel',
    description: 'Send messages, images, GIFs, and more',
    icon: Hash
  },
  {
    value: 'Voice' as ChannelType,
    label: 'Voice Channel',
    description: 'Hang out together with voice and video',
    icon: Volume2
  },
  {
    value: 'Announcement' as ChannelType,
    label: 'Announcement Channel',
    description: 'Important updates for your server',
    icon: Megaphone
  }
]

const form = reactive({
  name: '',
  description: '',
  type: 'Text' as ChannelType
})

async function handleCreate() {
  if (!form.name || !appStore.currentServer) return

  isLoading.value = true
  try {
    await channelService.createChannel({
      serverId: appStore.currentServer.id,
      name: form.name.toLowerCase().replace(/\s+/g, '-'),
      description: form.description || undefined,
      type: form.type
    })
    await appStore.refreshChannels(appStore.currentServer.id)
    emit('close')
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    isLoading.value = false
  }
}
</script>