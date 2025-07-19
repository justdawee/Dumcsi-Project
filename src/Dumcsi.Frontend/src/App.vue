<template>
  <RouterView v-if="!authCheckPending"/>
  <div v-else class="h-screen flex items-center justify-center bg-gray-900">
    <Loader2 class="w-8 h-8 text-primary animate-spin"/>
  </div>
  <ToastContainer/>
</template>

<script lang="ts" setup>
import {ref, onMounted} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {Loader2} from 'lucide-vue-next'
import ToastContainer from '@/components/ui/ToastContainer.vue';
import {useAppStore} from "@/stores/app.ts";
import {signalRService} from "@/services/signalrService.ts";

const authStore = useAuthStore()
const appStore = useAppStore();
const authCheckPending = ref(true)

// Initialize SignalR connection
onMounted(async () => {
  if (authStore.token) {
    await authStore.checkAuth()
  }
  authCheckPending.value = false

  // Ha be van jelentkezve a felhasználó
  if (authStore.isAuthenticated && authStore.user) {
    // SignalR kapcsolat indítása
    await signalRService.start();

    // Saját státusz beállítása online-ra
    if (authStore.user.id) {
      appStore.onlineUsers.add(authStore.user.id);
    }
  }
})
</script>