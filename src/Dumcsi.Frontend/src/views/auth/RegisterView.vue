<template>
  <div
      class="min-h-screen flex items-center justify-center bg-linear-to-br from-bg-base via-purple-900/20 to-bg-base">
    <div
        class="w-full max-w-md p-8 space-y-6 bg-bg-surface/50 backdrop-blur-xs rounded-2xl shadow-2xl border border-border-default/50">
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-4 bg-primary/20 rounded-2xl">
          <MessageSquare class="w-10 h-10 text-primary"/>
        </div>
        <h1 class="text-3xl font-bold text-text-default">Join Dumcsi</h1>
        <p class="mt-2 text-text-muted">Create your account to get started</p>
      </div>

      <div v-if="authStore.error" class="p-4 bg-danger/10 border border-danger/50 rounded-lg">
        <p class="text-sm text-danger">{{ authStore.error }}</p>
      </div>

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
              placeholder="Create a password"
              required
              type="password"
          />
          <p v-if="form.password && (form.password.length < 6 || form.password.length > 20)" class="form-error">
            Password must be between 6 and 20 characters.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2" for="confirm-password">
            Confirm Password
          </label>
          <input
              id="confirm-password"
              v-model="form.confirmPassword"
              class="w-full px-4 py-3 bg-main-700/50 border border-main-600 rounded-lg text-text-default placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              placeholder="Confirm your password"
              required
              type="password"
          />
          <p v-if="passwordMismatchError" class="form-error">{{ passwordMismatchError }}</p>
        </div>

        <button
            :disabled="authStore.loading || !isFormValid"
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

      <div class="text-center">
        <p class="text-text-muted">
          Already have an account?
          <RouterLink
              class="text-primary hover:text-primary-hover transition"
              to="/auth/login"
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
import {useRouter} from 'vue-router'
import {MessageSquare, Loader2} from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  authStore.clearError()
})

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const passwordMismatchError = computed(() => {
  if (form.value.confirmPassword && form.value.password !== form.value.confirmPassword) {
    return 'Passwords do not match.';
  }
  return '';
});

const isFormValid = computed(() => {
  return form.value.password === form.value.confirmPassword &&
      form.value.password.length >= 6 &&
      form.value.password.length <= 20 &&
      !passwordMismatchError.value
})

const handleRegister = async () => {
  if (!isFormValid.value) {
    return
  }

  try {
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password
    })
    // Sikeres regisztráció után átirányítás a login oldalra
    await router.push({
      name: 'Login',
      query: {
        registered: 'true',
        username: form.value.username
      }
    });
  } catch (error) {
    // Error is handled in the store
  }
}
</script>