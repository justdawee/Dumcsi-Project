<template>
  <div class="flex h-full w-full bg-bg-base">
    <!-- Home Sidebar -->
    <HomeSidebar />
    
    <!-- Main Content -->
    <div class="flex-1 flex flex-col bg-bg-base">
    <div class="px-6 py-4 border-b border-border-default flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-default">Your Servers</h1>
      <div class="flex items-center gap-3">
        <button
            class="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-main-700 transition"
            @click="showUserMenu = !showUserMenu"
        >
          <UserAvatar
              :avatar-url="authStore.user?.avatar"
              :size="32"
              :user-id="authStore.user?.id"
              :username="authStore.user?.username || ''"
          />
          <span class="text-text-default font-medium">{{ authStore.user?.username }}</span>
          <ChevronDown class="w-4 h-4 text-text-muted"/>
        </button>

        <div
            v-if="showUserMenu"
            class="absolute right-6 top-16 w-48 bg-bg-base rounded-lg shadow-lg border border-border-default py-2 z-50"
        >
          <button
              class="w-full px-4 py-2 text-left text-text-secondary hover:bg-bg-surface hover:text-text-default transition flex items-center gap-2"
              @click="editUser"
          >
            <Edit class="w-4 h-4"/>
            Edit Profile
          </button>
          <button
              class="w-full px-4 py-2 text-left text-danger hover:bg-danger/10 transition flex items-center gap-2"
              @click="handleLogout"
          >
            <LogOut class="w-4 h-4"/>
            Logout
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 p-6 overflow-y-auto">
      <div v-if="appStore.loading.servers" class="flex items-center justify-center h-full">
        <Loader2 class="w-8 h-8 text-primary animate-spin"/>
      </div>

      <div v-else-if="appStore.servers.length === 0"
           class="flex flex-col items-center justify-center h-full text-center">
        <div class="w-24 h-24 mb-6 bg-main-700 rounded-full flex items-center justify-center">
          <Server class="w-12 h-12 text-text-tertiary"/>
        </div>
        <h2 class="text-xl font-semibold text-text-default mb-2">No servers yet</h2>
        <p class="text-text-muted mb-6">Create or join a server to get started!</p>
        <button
            class="btn-primary flex items-center gap-2"
            @click="openCreateModal"
        >
          <Plus class="w-5 h-5"/>
          Add Server
        </button>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <RouterLink
            v-for="server in appStore.servers"
            :key="server.id"
            :to="`/servers/${server.id}`"
            class="group bg-main-700 rounded-xl p-6 hover:bg-main-600 transition-all hover:shadow-lg"
        >
          <div class="flex items-center gap-4 mb-3">
            <ServerAvatar
                :icon="server.icon"
                :server-id="server.id"
                :server-name="server.name"
                class="rounded-[8px]"
            />
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-text-default truncate group-hover:text-primary transition">
                {{ server.name }}
              </h3>
              <p class="text-sm text-text-muted">
                {{ server.memberCount }} {{ server.memberCount === 1 ? 'member' : 'members' }}
              </p>
            </div>
          </div>
          <p class="text-sm text-text-muted line-clamp-2">
            {{ server.description || 'No description' }}
          </p>
          <div class="mt-3 flex items-center justify-between">
            <span v-if="server.isOwner" class="text-xs bg-primary/20 text-primary px-2 py-1 rounded-sm">
              Owner
            </span>
            <span v-else></span>
            <span class="text-xs text-text-tertiary">
              {{ formatDate(server.createdAt) }}
            </span>
          </div>
        </RouterLink>
      </div>
    </div>

    <CreateServerModal
        v-model="showCreateModal"
        @close="closeCreateModal"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useAuthStore} from '@/stores/auth'
import {useAppStore} from '@/stores/app'
import {useRouter} from 'vue-router';
import {ChevronDown, LogOut, Loader2, Server, Plus, Edit} from 'lucide-vue-next'
import CreateServerModal from '@/components/server/CreateServerModal.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import ServerAvatar from "@/components/common/ServerAvatar.vue";
import HomeSidebar from '@/components/common/HomeSidebar.vue';

const authStore = useAuthStore()
const appStore = useAppStore()
const router = useRouter();

const showUserMenu = ref(false)
const showCreateModal = ref(false)

const openCreateModal = () => {
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const handleLogout = async () => {
  await authStore.logout()
}

const editUser = () => {
  // Navigate to user settings page
  router.push({name: 'UserSettings'});
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>