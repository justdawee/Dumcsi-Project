<template>
  <div class="flex-1 flex">
    <!-- Settings sidebar -->
    <div class="w-60 bg-[var(--bg-secondary)] p-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">User Settings</h2>
      
      <nav class="space-y-1">
        <button
          v-for="item in settingsItems"
          :key="item.id"
          @click="activeSection = item.id"
          :class="[
            'w-full px-3 py-2 rounded-lg text-left transition-colors',
            activeSection === item.id
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]/50 hover:text-[var(--text-primary)]'
          ]"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="mt-8 pt-8 border-t border-[var(--bg-hover)]">
        <button
          @click="handleLogout"
          class="w-full px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut class="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>

    <!-- Settings content -->
    <div class="flex-1 bg-[var(--bg-primary)] p-8 overflow-y-auto">
      <div class="max-w-2xl">
        <!-- My Account -->
        <div v-if="activeSection === 'account'" class="space-y-6">
          <div>
            <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">My Account</h1>
            <p class="text-[var(--text-secondary)]">Manage your account information and preferences</p>
          </div>

          <!-- Profile section -->
          <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-4">
            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Profile Information</h3>
            
            <div class="flex items-start gap-6">
              <div>
                <p class="text-sm text-[var(--text-secondary)] mb-2">Avatar</p>
                <div class="relative">
                  <UserAvatar :user="authStore.user!" :size="80" :showOnlineStatus="false" />
                  <button
                    class="absolute bottom-0 right-0 w-8 h-8 bg-[var(--accent-primary)] text-white rounded-full flex items-center justify-center hover:bg-[var(--accent-primary)]/90 transition-colors"
                  >
                    <Camera class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="flex-1 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Username
                  </label>
                  <input
                    v-model="profileForm.username"
                    type="text"
                    class="w-full px-4 py-2 bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Email
                  </label>
                  <input
                    :value="authStore.user?.email"
                    type="email"
                    disabled
                    class="w-full px-4 py-2 bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Status
                  </label>
                  <input
                    v-model="profileForm.status"
                    type="text"
                    placeholder="Set a status"
                    class="w-full px-4 py-2 bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-4">
              <button
                @click="saveProfile"
                :disabled="!hasProfileChanges || isSaving"
                class="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-xl hover:bg-[var(--accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <!-- Privacy & Safety -->
        <div v-if="activeSection === 'privacy'" class="space-y-6">
          <div>
            <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Privacy & Safety</h1>
            <p class="text-[var(--text-secondary)]">Control who can contact you and see your information</p>
          </div>

          <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-4">
            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Direct Messages</h3>
            
            <label class="flex items-center justify-between">
              <span class="text-[var(--text-primary)]">Allow direct messages from server members</span>
              <input type="checkbox" class="toggle" checked />
            </label>
          </div>

          <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-4">
            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Blocked Users</h3>
            <p class="text-[var(--text-secondary)]">You haven't blocked anyone.</p>
          </div>
        </div>

        <!-- Appearance -->
        <div v-if="activeSection === 'appearance'" class="space-y-6">
          <div>
            <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Appearance</h1>
            <p class="text-[var(--text-secondary)]">Customize how Dumcsi looks on your device</p>
          </div>

          <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-4">
            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Theme</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <button
                @click="setTheme('light')"
                :class="[
                  'p-4 rounded-xl border-2 transition-all',
                  appStore.theme === 'light'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[var(--bg-hover)] hover:border-[var(--text-secondary)]'
                ]"
              >
                <Sun class="w-8 h-8 mx-auto mb-2 text-[var(--text-primary)]" />
                <p class="font-medium text-[var(--text-primary)]">Light</p>
              </button>

              <button
                @click="setTheme('dark')"
                :class="[
                  'p-4 rounded-xl border-2 transition-all',
                  appStore.theme === 'dark'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[var(--bg-hover)] hover:border-[var(--text-secondary)]'
                ]"
              >
                <Moon class="w-8 h-8 mx-auto mb-2 text-[var(--text-primary)]" />
                <p class="font-medium text-[var(--text-primary)]">Dark</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Camera, Sun, Moon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { userService } from '@/services/userService'
import UserAvatar from '@/components/common/UserAvatar.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const activeSection = ref('account')
const isSaving = ref(false)

const settingsItems = [
  { id: 'account', label: 'My Account' },
  { id: 'privacy', label: 'Privacy & Safety' },
  { id: 'appearance', label: 'Appearance' }
]

const profileForm = reactive({
  username: authStore.user?.username || '',
  status: authStore.user?.status || ''
})

const hasProfileChanges = computed(() => {
  return profileForm.username !== authStore.user?.username ||
         profileForm.status !== (authStore.user?.status || '')
})

async function saveProfile() {
  isSaving.value = true
  try {
    const updates = {
      username: profileForm.username !== authStore.user?.username ? profileForm.username : undefined,
      status: profileForm.status !== authStore.user?.status ? profileForm.status : undefined
    }
    
    const updatedUser = await userService.updateProfile(updates)
    authStore.user = updatedUser
    appStore.showError('Profile updated successfully')
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    isSaving.value = false
  }
}

function setTheme(theme: 'light' | 'dark') {
  appStore.theme = theme
  appStore.toggleTheme()
}

async function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    await authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.toggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2;
}

.toggle:checked {
  @apply bg-[var(--accent-primary)];
}

.toggle::before {
  @apply inline-block h-4 w-4 transform rounded-full bg-white transition-transform;
  content: '';
  position: absolute;
  left: 0.25rem;
}

.toggle:checked::before {
  @apply translate-x-5;
}
</style>