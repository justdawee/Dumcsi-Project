<template>
  <div class="min-h-screen flex items-center justify-center bg-discord-gray-900 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-white mb-2">Welcome back!</h1>
        <p class="text-discord-gray-400">We're so excited to see you again!</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <BaseInput
          id="usernameOrEmail"
          v-model="form.usernameOrEmail"
          label="Email or Username"
          type="text"
          required
          :error="errors.usernameOrEmail"
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
          Log In
        </BaseButton>

        <p class="text-center text-discord-gray-400 text-sm">
          Need an account? 
          <router-link to="/register" class="text-discord-blurple hover:underline">
            Register
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
import type { LoginRequestDto } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const loading = ref(false)

const form = reactive<LoginRequestDto>({
  usernameOrEmail: '',
  password: ''
})

const errors = reactive({
  usernameOrEmail: '',
  password: '',
  general: ''
})

const clearErrors = () => {
  errors.usernameOrEmail = ''
  errors.password = ''
  errors.general = ''
}

const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  if (!form.usernameOrEmail.trim()) {
    errors.usernameOrEmail = 'Email or username is required'
    isValid = false
  }

  if (!form.password) {
    errors.password = 'Password is required'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    await authStore.login(form)
    
    addToast({
      type: 'success',
      message: 'Welcome back!'
    })
    
    router.push('/app')
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Login failed'
    })
  } finally {
    loading.value = false
  }
}
</script>