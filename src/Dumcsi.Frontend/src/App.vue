<template>
  <RouterView v-if="!authCheckPending" />
  <div v-else class="h-screen flex items-center justify-center bg-gray-900">
    <Loader2 class="w-8 h-8 text-primary animate-spin" />
  </div>
  <ToastContainer />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Loader2 } from 'lucide-vue-next'
import ToastContainer from '@/components/ui/ToastContainer.vue';


const authStore = useAuthStore()
const authCheckPending = ref(true)

// Check authentication state on mount
onMounted(async () => {
  if (authStore.token) {
    await authStore.checkAuth()
  }
  authCheckPending.value = false
})
</script>