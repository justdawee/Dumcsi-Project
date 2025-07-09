<template>
  <div class="min-h-screen flex items-center justify-center bg-discord-gray-900 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-white mb-2">Create an account</h1>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <BaseInput
          id="email"
          v-model="form.email"
          label="Email"
          type="email"
          required
          :error="errors.email"
        />

        <BaseInput
          id="username"
          v-model="form.username"
          label="Username"
          type="text"
          required
          :error="errors.username"
        />

        <BaseInput
          id="password"
          v-model="form.password"
          label="Password"
          type="password"
          required
          :error="errors.password"
        />

        <BaseButton
          type="submit"
          :loading="loading"
          full-width
          class="mt-6"
        >
          Continue
        </BaseButton>

        <p class="text-center text-discord-gray-400 text-sm">
          Already have an account? 
          <router-link to="/login" class="text-discord-blurple hover:underline">
            Log In
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type { RegisterRequestDto } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const loading = ref(false)

const form = reactive<RegisterRequestDto>({
  email: '',
  username: '',
  password: ''
})

const errors = reactive({
  email: '',
  username: '',
  password: ''
})

const clearErrors = () => {
  errors.email = ''
  errors.username = ''
  errors.password = ''
}

const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  if (!form.email.trim()) {
    errors.email = 'Email is required'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Email is invalid'
    isValid = false
  }

  if (!form.username.trim()) {
    errors.username = 'Username is required'
    isValid = false
  } else if (form.username.length < 2) {
    errors.username = 'Username must be at least 2 characters'
    isValid = false
  }

  if (!form.password) {
    errors.password = 'Password is required'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    await authStore.register(form)
    
    addToast({
      type: 'success',
      message: 'Account created successfully!'
    })
    
    router.push('/app')
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Registration failed'
    })
  } finally {
    loading.value = false
  }
}
</script>