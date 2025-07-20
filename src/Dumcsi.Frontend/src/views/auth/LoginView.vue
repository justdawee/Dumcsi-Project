<template>
  <div
      class="min-h-screen flex items-center justify-center bg-linear-to-br from-bg-base via-purple-900/20 to-bg-base">
    <div
        class="w-full max-w-md p-8 space-y-6 bg-bg-surface/50 backdrop-blur-xs rounded-2xl shadow-2xl border border-border-default/50">
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-4 bg-primary/20 rounded-2xl">
          <MessageSquare class="w-10 h-10 text-primary"/>
        </div>
        <h1 class="text-3xl font-bold text-text-default">Welcome back!</h1>
        <p class="mt-2 text-text-muted">Login to your Dumcsi account</p>
      </div>

      <div v-if="authStore.error" class="p-4 bg-danger/10 border border-danger/50 rounded-lg">
        <p class="text-sm text-danger">{{ authStore.error }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2" for="username">
            Username or Email
          </label>
          <input
              id="username"
              v-model="form.usernameOrEmail"
              class="w-full px-4 py-3 bg-main-700/50 border border-main-600 rounded-lg text-text-default placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              placeholder="Enter your username or email"
              required
              type="text"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2" for="password">
            Password
          </label>
          <input
              id="password"
              ref="passwordInput"
              v-model="form.password"
              class="w-full px-4 py-3 bg-main-700/50 border border-main-600 rounded-lg text-text-default placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              placeholder="Enter your password"
              required
              type="password"
          />
        </div>

        <button
            :disabled="authStore.loading"
            class="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-text-default font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
            type="submit"
        >
          <span v-if="!authStore.loading">Sign In</span>
          <span v-else class="inline-flex items-center">
            <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5"/>
            Signing in...
          </span>
        </button>
      </form>

      <div class="text-center">
        <p class="text-text-muted">
          Don't have an account?
          <RouterLink
              class="text-primary hover:text-primary-hover transition"
              to="/auth/register"
          >
            Create one
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {useRoute} from 'vue-router'
import {MessageSquare, Loader2} from 'lucide-vue-next'

const authStore = useAuthStore()
const route = useRoute()

const form = ref({
  usernameOrEmail: '',
  password: ''
})
const passwordInput = ref(null)

onMounted(() => {
  authStore.clearError()

  if (route.query.username) {
    form.value.usernameOrEmail = route.query.username
    passwordInput.value?.focus()
  }
})

const handleLogin = async () => {
  try {
    await authStore.login(form.value)
  } catch (error) {
    // A hibát a store kezeli
  }
}
</script>