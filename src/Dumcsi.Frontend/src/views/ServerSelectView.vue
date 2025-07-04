<template>
  <div class="flex-1 flex flex-col bg-gray-800">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Your Servers</h1>
      <div class="flex items-center gap-3">
        <button
          @click="showUserMenu = !showUserMenu"
          class="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          <UserAvatar
          :avatar-url="authStore.user?.profilePictureUrl"
          :username="authStore.user?.username || ''"
          :size="32"
          />
          <span class="text-white font-medium">{{ authStore.user?.username }}</span>
          <ChevronDown class="w-4 h-4 text-gray-400" />
        </button>
        
        <!-- User Dropdown Menu -->
        <div
          v-if="showUserMenu"
          class="absolute right-6 top-16 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-700 py-2 z-50"
        >
          <button
            @click="editUser"
            class="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white transition flex items-center gap-2"
          >
            <Edit class="w-4 h-4" />
            Edit Profile
          </button>
          <button
            @click="handleLogout"
            class="w-full px-4 py-2 text-left text-red-300 hover:bg-red-800/10 hover:text-red-400 transition flex items-center gap-2"
          >
            <LogOut class="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
    
    <!-- Server Grid -->
    <div class="flex-1 p-6 overflow-y-auto">
      <div v-if="appStore.loading.servers" class="flex items-center justify-center h-full">
        <Loader2 class="w-8 h-8 text-primary animate-spin" />
      </div>
      
      <div v-else-if="appStore.servers.length === 0" class="flex flex-col items-center justify-center h-full text-center">
        <div class="w-24 h-24 mb-6 bg-gray-700 rounded-full flex items-center justify-center">
          <Server class="w-12 h-12 text-gray-500" />
        </div>
        <h2 class="text-xl font-semibold text-white mb-2">No servers yet</h2>
        <p class="text-gray-400 mb-6">Create or join a server to get started!</p>
        <button
          @click="showCreateModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <Plus class="w-5 h-5" />
          Add Server
        </button>
      </div>
      
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <RouterLink
          v-for="server in appStore.servers"
          :key="server.id"
          :to="`/servers/${server.id}`"
          class="group bg-gray-700 rounded-xl p-6 hover:bg-gray-650 transition-all hover:shadow-lg"
        >
          <div class="flex items-center gap-4 mb-3">
            <div class="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden">
              <img
                v-if="server.iconUrl"
                :src="server.iconUrl"
                :alt="server.name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-2xl font-bold text-primary">
                {{ getServerInitials(server.name) }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-white truncate group-hover:text-primary transition">
                {{ server.name }}
              </h3>
              <p class="text-sm text-gray-400">
                {{ server.memberCount }} {{ server.memberCount === 1 ? 'member' : 'members' }}
              </p>
            </div>
          </div>
          <p class="text-sm text-gray-400 line-clamp-2">
            {{ server.description || 'No description' }}
          </p>
          <div class="mt-3 flex items-center justify-between">
            <span v-if="server.isOwner" class="text-xs bg-primary/20 text-primary px-2 py-1 rounded-sm">
              Owner
            </span>
            <span v-else></span>
            <span class="text-xs text-gray-500">
              {{ formatDate(server.createdAt) }}
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
    
    <!-- Create Server Modal -->
    <CreateServerModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router';
import { User, ChevronDown, LogOut, Loader2, Server, Plus, Edit } from 'lucide-vue-next'
import CreateServerModal from '@/components/server/CreateServerModal.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

const authStore = useAuthStore()
const appStore = useAppStore()
const router = useRouter();

const showUserMenu = ref(false)
const showCreateModal = ref(false)

const handleLogout = async () => {
  await authStore.logout()
}

watchEffect(() => {
  console.log('ServerSelectView sees username:', authStore.user?.username)
})

const editUser = () => {
  // Navigate to user settings page
  router.push({ name: 'UserSettings' });
}

const getServerInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}
</script>