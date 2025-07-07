<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="w-full max-w-md p-8 space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50">
      <!-- Logo & Title -->
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-4 bg-primary/20 rounded-2xl">
          <MessageSquare class="w-10 h-10 text-primary" />
        </div>
        <h1 class="text-3xl font-bold text-white">Welcome back!</h1>
        <p class="mt-2 text-gray-400">Login to your Dumcsi account</p>
      </div>

      <!-- Error Alert -->
      <div v-if="authStore.error" class="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
        <p class="text-sm text-red-400">{{ authStore.error }}</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-300 mb-2">
            Username or Email
          </label>
          <input
            id="username"
            v-model="form.usernameOrEmail"
            type="text"
            required
            class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
            placeholder="Enter your username or email"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
            placeholder="Enter your password"
          />
           <p v-if="passwordError" class="mt-1 text-xs text-red-400">{{ passwordError }}</p>
        </div>

        <button
          type="submit"
          :disabled="authStore.loading || !!passwordError"
          class="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
        >
          <span v-if="!authStore.loading">Sign In</span>
          <span v-else class="inline-flex items-center">
            <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5" />
            Signing in...
          </span>
        </button>
      </form>

      <!-- Register Link -->
      <div class="text-center">
        <p class="text-gray-400">
          Don't have an account?
          <RouterLink to="/auth/register" class="text-primary hover:text-primary-hover font-medium transition">
            Create one
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { MessageSquare, Loader2 } from 'lucide-vue-next';

const authStore = useAuthStore();

const form = ref({
  usernameOrEmail: '',
  password: ''
});

// Password validation logic
const passwordError = computed(() => {
  if (form.value.password && form.value.password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (form.value.password && form.value.password.length > 20) {
    return 'Password cannot be more than 20 characters long.';
  }
  return ''; // No error
});

const handleLogin = async () => {
  // Prevent submission if there's a validation error
  if (passwordError.value) {
    return;
  }

  try {
    // Clear previous errors before attempting to log in
    authStore.error = null;
    await authStore.login(form.value);
  } catch (error) {
    // The error is already handled and displayed by the auth store and api interceptor
    console.error("Login failed:", error);
  }
};
</script>