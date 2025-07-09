<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
    
    <div class="relative bg-discord-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">Create a server</h2>
        <button
          class="text-discord-gray-400 hover:text-white transition-colors"
          @click="$emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput
          id="name"
          v-model="form.name"
          label="Server Name"
          placeholder="Enter server name"
          required
          :error="errors.name"
        />
        
        <BaseInput
          id="description"
          v-model="form.description"
          label="Description (optional)"
          placeholder="What's your server about?"
          :error="errors.description"
        />
        
        <div class="flex items-center space-x-3">
          <input
            id="public"
            v-model="form.public"
            type="checkbox"
            class="w-4 h-4 text-discord-blurple bg-discord-gray-700 border-discord-gray-600 rounded focus:ring-discord-blurple"
          />
          <label for="public" class="text-sm text-discord-gray-300">
            Make server public (anyone can join)
          </label>
        </div>
        
        <div class="flex space-x-3 pt-4">
          <BaseButton
            type="button"
            variant="ghost"
            @click="$emit('close')"
            class="flex-1"
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="submit"
            :loading="loading"
            class="flex-1"
          >
            Create Server
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type { CreateServerRequestDto, ServerDetailDto } from '@/types'

const emit = defineEmits<{
  close: []
  created: [server: ServerDetailDto]
}>()

const appStore = useAppStore()
const { addToast } = useToast()

const loading = ref(false)

const form = reactive<CreateServerRequestDto>({
  name: '',
  description: '',
  public: false
})

const errors = reactive({
  name: '',
  description: ''
})

const clearErrors = () => {
  errors.name = ''
  errors.description = ''
}

const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  if (!form.name.trim()) {
    errors.name = 'Server name is required'
    isValid = false
  } else if (form.name.length < 3) {
    errors.name = 'Server name must be at least 3 characters'
    isValid = false
  }

  if (form.description && form.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    const server = await appStore.createServer(form)
    emit('created', server)
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Failed to create server'
    })
  } finally {
    loading.value = false
  }
}
</script>