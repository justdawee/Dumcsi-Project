<template>
  <RouterView />
  <ToastContainer />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ToastContainer from '@/components/ui/ToastContainer.vue';

const authStore = useAuthStore()

onMounted(() => {
  // Check if user is still authenticated on app mount
  if (authStore.token && !authStore.user) {
    // Token exists but user data is missing, logout
    authStore.logout()
  }
})

</script>