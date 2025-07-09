<template>
  <div class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo and title -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-[var(--accent-primary)] rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <MessageCircle class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-[var(--text-primary)]">Welcome back!</h1>
        <p class="text-[var(--text-secondary)] mt-2">Log in to Dumcsi to continue</p>
      </div>

      <!-- Login form -->
      <form @submit.prevent="handleLogin" class="bg-[var(--bg-secondary)] rounded-2xl p-8 shadow-xl">
        <div class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Email Address
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Eye v-if="!showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 bg-[var(--bg-tertiary)] border-gray-600 rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
              <span class="ml-2 text-sm text-[var(--text-secondary)]">Remember me</span>
            </label>
            <a href="#" class="text-sm text-[var(--accent-primary)] hover:underline">
              Forgot password?
            </a>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.isLoading"
          class="w-full mt-6 px-4 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Loader2 v-if="authStore.isLoading" class="w-5 h-5 animate-spin mr-2" />
          {{ authStore.isLoading ? 'Logging in...' : 'Log In' }}
        </button>

        <div class="mt-6 text-center">
          <span class="text-[var(--text-secondary)]">Don't have an account?</span>
          <router-link to="/register" class="ml-1 text-[var(--accent-primary)] hover:underline font-medium">
            Sign up
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { MessageCircle, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)
const rememberMe = ref(false)

async function handleLogin() {
  try {
    await authStore.login(form)
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/')
  } catch (error) {
    // Error is handled by the API interceptor
  }
}
</script>