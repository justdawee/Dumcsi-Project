<template>
  <div id="app" :class="{ 'dark': appStore.theme === 'dark' }">
    <router-view />
    
    <!-- Global error toast -->
    <Transition name="slide-up">
      <div v-if="appStore.error" 
           class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
        <AlertCircle class="w-5 h-5" />
        <span>{{ appStore.error }}</span>
        <button @click="appStore.error = null" class="ml-2">
          <X class="w-4 h-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import signalrService from '@/services/signalrService'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      await signalrService.initialize()
      await appStore.loadServers()
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }
})

onUnmounted(() => {
  signalrService.stop()
})

// Watch for auth changes
authStore.$subscribe(async (mutation, state) => {
  if (state.isAuthenticated && !signalrService.isConnected()) {
    await signalrService.initialize()
    await appStore.loadServers()
  } else if (!state.isAuthenticated && signalrService.isConnected()) {
    await signalrService.stop()
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: Inter, system-ui, -apple-system, sans-serif;
}

.dark {
  color-scheme: dark;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>