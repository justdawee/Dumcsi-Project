<template>
  <div
      class="min-h-screen flex items-center justify-center bg-linear-to-br from-bg-base via-purple-900/20 to-bg-base">
    <div
        class="w-full max-w-md p-8 space-y-6 bg-bg-surface/50 backdrop-blur-xs rounded-2xl shadow-2xl border border-border-default/50">
      <!-- Logo & Title -->
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-4 bg-primary/20 rounded-2xl">
          <MessageSquare class="w-10 h-10 text-primary"/>
        </div>
        <h1 class="text-3xl font-bold text-text-default">Join Dumcsi</h1>
        <p class="mt-2 text-text-muted">Create your account to get started</p>
      </div>

      <!-- Error Alert -->
      <div v-if="authStore.error" class="p-4 bg-danger/10 border border-danger/50 rounded-lg">
        <p class="text-sm text-danger">{{ authStore.error }}</p>
      </div>

      <!-- Register Form -->
      <form class="space-y-4" @submit.prevent="handleRegister">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2" for="username">
            Username
          </label>
          <input
              id="username"
              v-model="form.username"
              class="w-full px-4 py-3 bg-main-700/50 border border-main-600 rounded-lg text-text-default placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              placeholder="Choose a username"
              required
              type="text"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2" for="email">
            Email
          </label>
          <input
              id="email"
              v-model="form.email"
              class="w-full px-4 py-3 bg-main-700/50 border border-main-600 rounded-lg text-text-default placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              placeholder="Enter your email"
              required
              type="email"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2" for="password">
            Password
          </label>
          <input
              id="password"
              v-model="form.password"
              class="w-full px-4 py-3 bg-main-700/50 border border-main-600 rounded-lg text-text-default placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              maxlength="20"
              minlength="6"
              placeholder="Create a password (6-20 characters)"
              required
              type="password"
          />
          <p class="mt-1 text-xs text-text-muted">Password must be 6-20 characters</p>
        </div>

        <button
            :disabled="authStore.loading"
            class="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-text-default font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
            type="submit"
        >
          <span v-if="!authStore.loading">Create Account</span>
          <span v-else class="inline-flex items-center">
            <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5"/>
            Creating account...
          </span>
        </button>
      </form>

      <!-- Login Link -->
      <div class="text-center">
        <p class="text-text-muted">
          Already have an account?
          <RouterLink
              class="text-primary hover:text-primary-hover transition"
              to="/login"
          >
            Sign in
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {MessageSquare, Loader2} from 'lucide-vue-next'

const authStore = useAuthStore()

onMounted(() => {
  authStore.clearError()
})

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const isFormValid = computed(() => {
  return form.value.password === form.value.confirmPassword &&
      form.value.password.length >= 6 &&
      form.value.password.length <= 20
})

const handleRegister = async () => {
  if (!isFormValid.value) {
    authStore.error = 'Passwords do not match or invalid length'
    return
  }

  try {
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password
    })
  } catch (error) {
    // Error is handled in the store
  }
}
</script>
