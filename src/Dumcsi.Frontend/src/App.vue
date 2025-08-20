<template>
  <RouterView v-if="!authCheckPending" />
  <div v-else class="h-screen flex items-center justify-center bg-bg-base">
    <Loader2 class="w-8 h-8 text-primary animate-spin" />
  </div>
  <ToastContainer />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Loader2 } from 'lucide-vue-next'
import ToastContainer from '@/components/ui/ToastContainer.vue';


const authStore = useAuthStore()
const authCheckPending = ref(true)

// Disable right-click context menu globally
const disableContextMenu = (event: MouseEvent) => {
  event.preventDefault()
}

// Check authentication state on mount
onMounted(async () => {
  if (authStore.token) {
    await authStore.checkAuth()
  }
  authCheckPending.value = false
  
  // Add global event listener to disable right-click context menu
  document.addEventListener('contextmenu', disableContextMenu)
})

// Clean up event listener on unmount
onUnmounted(() => {
  document.removeEventListener('contextmenu', disableContextMenu)
})
</script>