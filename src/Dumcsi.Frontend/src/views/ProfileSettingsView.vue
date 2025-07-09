<template>
  <div class="flex-1 max-w-2xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white mb-2">User Settings</h1>
      <p class="text-discord-gray-400">Manage your account settings and preferences</p>
    </div>

    <div class="space-y-8">
      <!-- Avatar Section -->
      <div class="bg-discord-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Avatar</h2>
        <div class="flex items-center space-x-4">
          <UserAvatar
            :src="currentUser?.avatar"
            :username="currentUser?.username"
            size="xl"
          />
          <div class="space-y-2">
            <BaseButton size="sm" @click="triggerAvatarUpload">
              Change Avatar
            </BaseButton>
            <BaseButton 
              v-if="currentUser?.avatar" 
              size="sm" 
              variant="danger" 
              @click="removeAvatar"
            >
              Remove Avatar
            </BaseButton>
          </div>
        </div>
        <input
          ref="avatarInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleAvatarUpload"
        />
      </div>

      <!-- Profile Information -->
      <div class="bg-discord-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Profile Information</h2>
        <form @submit.prevent="updateProfile" class="space-y-4">
          <BaseInput
            id="username"
            v-model="profileForm.username"
            label="Username"
            required
            :error="profileErrors.username"
          />
          
          <BaseInput
            id="email"
            v-model="profileForm.email"
            label="Email"
            type="email"
            required
            :error="profileErrors.email"
          />
          
          <BaseInput
            id="globalNickname"
            v-model="profileForm.globalNickname"
            label="Display Name"
            :error="profileErrors.globalNickname"
          />

          <BaseButton
            type="submit"
            :loading="profileLoading"
          >
            Save Changes
          </BaseButton>
        </form>
      </div>

      <!-- Password Change -->
      <div class="bg-discord-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Change Password</h2>
        <form @submit.prevent="changePassword" class="space-y-4">
          <BaseInput
            id="currentPassword"
            v-model="passwordForm.currentPassword"
            label="Current Password"
            type="password"
            required
            :error="passwordErrors.currentPassword"
          />
          
          <BaseInput
            id="newPassword"
            v-model="passwordForm.newPassword"
            label="New Password"
            type="password"
            required
            :error="passwordErrors.newPassword"
          />

          <BaseButton
            type="submit"
            :loading="passwordLoading"
          >
            Update Password
          </BaseButton>
        </form>
      </div>

      <!-- Logout -->
      <div class="bg-discord-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Account Actions</h2>
        <BaseButton
          variant="danger"
          @click="logout"
        >
          Logout
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import UserAvatar from '@/components/common/UserAvatar.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type { UpdateUserProfileDto, ChangePasswordDto } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const { addToast } = useToast()

const avatarInputRef = ref<HTMLInputElement>()
const profileLoading = ref(false)
const passwordLoading = ref(false)

const currentUser = computed(() => authStore.currentUser)

const profileForm = reactive<UpdateUserProfileDto>({
  username: currentUser.value?.username || '',
  email: currentUser.value?.email || '',
  globalNickname: currentUser.value?.globalNickname || '',
  avatar: currentUser.value?.avatar || null
})

const passwordForm = reactive<ChangePasswordDto>({
  currentPassword: '',
  newPassword: ''
})

const profileErrors = reactive({
  username: '',
  email: '',
  globalNickname: ''
})

const passwordErrors = reactive({
  currentPassword: '',
  newPassword: ''
})

const triggerAvatarUpload = () => {
  avatarInputRef.value?.click()
}

const handleAvatarUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    await authStore.uploadAvatar(file)
    addToast({
      type: 'success',
      message: 'Avatar updated successfully!'
    })
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Failed to upload avatar'
    })
  }
}

const removeAvatar = async () => {
  try {
    await authStore.deleteAvatar()
    addToast({
      type: 'success',
      message: 'Avatar removed successfully!'
    })
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Failed to remove avatar'
    })
  }
}

const updateProfile = async () => {
  try {
    profileLoading.value = true
    await authStore.updateProfile(profileForm)
    addToast({
      type: 'success',
      message: 'Profile updated successfully!'
    })
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Failed to update profile'
    })
  } finally {
    profileLoading.value = false
  }
}

const changePassword = async () => {
  try {
    passwordLoading.value = true
    await authStore.changePassword(passwordForm)
    
    // Clear form
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    
    addToast({
      type: 'success',
      message: 'Password changed successfully!'
    })
  } catch (error) {
    addToast({
      type: 'danger',
      message: error instanceof Error ? error.message : 'Failed to change password'
    })
  } finally {
    passwordLoading.value = false
  }
}

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>