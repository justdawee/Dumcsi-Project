<template>
  <div class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo and title -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-[var(--accent-primary)] rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <MessageCircle class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-[var(--text-primary)]">Create an account</h1>
        <p class="text-[var(--text-secondary)] mt-2">Join Dumcsi and start chatting</p>
      </div>

      <!-- Register form -->
      <form @submit.prevent="handleRegister" class="bg-[var(--bg-secondary)] rounded-2xl p-8 shadow-xl">
        <div class="space-y-5">
          <div>
            <label for="username" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Username
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              minlength="3"
              class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
              placeholder="Choose a username"
            />
          </div>

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
                minlength="6"
                class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all pr-12"
                placeholder="At least 6 characters"
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

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-transparent rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
              placeholder="Confirm your password"
            />
          </div>

          <div class="flex items-start">
            <input
              v-model="agreeToTerms"
              type="checkbox"
              required
              class="w-4 h-4 mt-1 bg-[var(--bg-tertiary)] border-gray-600 rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <label class="ml-2 text-sm text-[var(--text-secondary)]">
              I agree to the 
              <a href="#" class="text-[var(--accent-primary)] hover:underline">Terms of Service</a>
              and 
              <a href="#" class="text-[var(--accent-primary)] hover:underline">Privacy Policy</a>
            </label>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.isLoading || !isFormValid"
          class="w-full mt-6 px-4 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Loader2 v-if="authStore.isLoading" class="w-5 h-5 animate-spin mr-2" />
          {{ authStore.isLoading ? 'Creating account...' : 'Create Account' }}
        </button>

        <div class="mt-6 text-center">
          <span class="text-[var(--text-secondary)]">Already have an account?</span>
          <router-link to="/login" class="ml-1 text-[var(--accent-primary)] hover:underline font-medium">
            Log in
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessageCircle, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const form = reactive({
  username: '',
  email: '',
  password: ''
})

const confirmPassword = ref('')
const showPassword = ref(false)
const agreeToTerms = ref(false)

const isFormValid = computed(() => {
  return form.password === confirmPassword.value && agreeToTerms.value
})

async function handleRegister() {
  if (form.password !== confirmPassword.value) {
    appStore.showError('Passwords do not match')
    return
  }

  try {
    await authStore.register(form)
    router.push('/')
  } catch (error) {
    // Error is handled by the API interceptor
  }
}
</script>