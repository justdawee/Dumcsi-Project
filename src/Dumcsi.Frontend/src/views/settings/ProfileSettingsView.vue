<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold text-white mb-6">Profile Settings</h1>

    <!-- Profile Form -->
    <form @submit.prevent="handleUpdateProfile" class="space-y-6">
      <!-- Avatar Section -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Avatar</h2>
        <div class="flex items-center space-x-4">
          <div class="relative group">
            <img
              :src="previewAvatar || getAvatarUrl(profileForm)"
              :alt="getDisplayName(profileForm)"
              class="w-20 h-20 rounded-full object-cover"
            />
            <div
              class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              @click="$refs.avatarInput.click()"
            >
              <Camera class="w-6 h-6 text-white" />
            </div>
            <!-- Upload progress indicator -->
            <div
              v-if="avatarUploading"
              class="absolute inset-0 rounded-full"
            >
              <svg class="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-gray-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  :stroke-dasharray="`${2 * Math.PI * 36}`"
                  :stroke-dashoffset="`${2 * Math.PI * 36 * (1 - uploadProgress / 100)}`"
                  class="text-primary transition-all duration-300"
                />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <input
              ref="avatarInput"
              type="file"
              @change="handleAvatarUpload"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              class="hidden"
              :disabled="avatarUploading"
            />
            <div class="space-y-2">
              <button
                type="button"
                @click="$refs.avatarInput.click()"
                :disabled="avatarUploading"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ avatarUploading ? 'Uploading...' : 'Change Avatar' }}
              </button>
              <button
                v-if="profileForm.avatarUrl"
                type="button"
                @click="handleRemoveAvatar"
                :disabled="avatarUploading || removingAvatar"
                class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-2"
              >
                Remove
              </button>
            </div>
            <p class="text-sm text-gray-400 mt-2">
              Recommended: 128x128px, max 5MB. Supports JPG, PNG, GIF, WebP.
            </p>
          </div>
        </div>
      </div>

      <!-- Basic Information -->
      <div class="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white mb-4">Basic Information</h2>
        
        <!-- Username -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-300 mb-1">
            Username
          </label>
          <input
            id="username"
            v-model="profileForm.username"
            type="text"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter username"
            required
            :disabled="loading"
          />
          <p class="text-xs text-gray-400 mt-1">
            This is your unique identifier for login.
          </p>
        </div>

        <!-- Global Nickname -->
        <div>
          <label for="globalNickname" class="block text-sm font-medium text-gray-300 mb-1">
            Display Name
          </label>
          <input
            id="globalNickname"
            v-model="profileForm.globalNickname"
            type="text"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter display name"
            :disabled="loading"
          />
          <p class="text-xs text-gray-400 mt-1">
            This is how you'll appear to others across all servers.
          </p>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="profileForm.email"
            type="email"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter email"
            required
            :disabled="loading"
          />
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="resetForm"
          :disabled="loading || !hasChanges"
          class="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          :disabled="loading || !hasChanges"
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          <span>{{ loading ? 'Saving...' : 'Save Changes' }}</span>
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
        </button>
      </div>
    </form>

    <!-- Password Change Section -->
    <div class="mt-8 bg-gray-800 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-white mb-4">Change Password</h2>
      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div>
          <label for="currentPassword" class="block text-sm font-medium text-gray-300 mb-1">
            Current Password
          </label>
          <input
            id="currentPassword"
            v-model="passwordForm.currentPassword"
            type="password"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter current password"
            required
            :disabled="changingPassword"
          />
        </div>
        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-300 mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            v-model="passwordForm.newPassword"
            type="password"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter new password"
            required
            minlength="8"
            :disabled="changingPassword"
          />
        </div>
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            v-model="passwordForm.confirmPassword"
            type="password"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Confirm new password"
            required
            :disabled="changingPassword"
          />
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="changingPassword || !isPasswordFormValid"
            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <span>{{ changingPassword ? 'Changing...' : 'Change Password' }}</span>
            <Loader2 v-if="changingPassword" class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </form>
    </div>

    <!-- Danger Zone -->
    <div class="mt-8 bg-red-900/20 border border-red-900/50 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
      <p class="text-gray-300 mb-4">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      <button
        @click="showDeleteConfirm = true"
        class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Delete Account
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-if="showDeleteConfirm"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteAccount"
      title="Delete Account"
      message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
      confirm-text="Delete My Account"
      :is-loading="deletingAccount"
      intent="danger"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { useToast } from '@/composables/useToast';
import userService from '@/services/userService';
import uploadService from '@/services/uploadService';
import { Camera, Loader2 } from 'lucide-vue-next';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type { UpdateProfilePayload, UpdatePasswordPayload } from '@/services/types';

// Composables
const router = useRouter();
const authStore = useAuthStore();
const { getDisplayName, getAvatarUrl } = useUserDisplay();
const { addToast } = useToast();

// State
const loading = ref(false);
const avatarUploading = ref(false);
const uploadProgress = ref(0);
const removingAvatar = ref(false);
const changingPassword = ref(false);
const deletingAccount = ref(false);
const showDeleteConfirm = ref(false);

// Forms
const originalProfile = ref({
  username: '',
  email: '',
  globalNickname: '',
  avatarUrl: ''
});

const profileForm = ref({
  username: '',
  email: '',
  globalNickname: '',
  avatarUrl: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const previewAvatar = ref<string>('');

// Computed
const hasChanges = computed(() => {
  return JSON.stringify(profileForm.value) !== JSON.stringify(originalProfile.value);
});

const isPasswordFormValid = computed(() => {
  return passwordForm.value.currentPassword.length > 0
    && passwordForm.value.newPassword.length >= 8
    && passwordForm.value.newPassword === passwordForm.value.confirmPassword;
});

// Methods
const loadProfile = async () => {
  try {
    const profile = await authStore.fetchUserProfile();
    if (profile) {
      const data = {
        username: profile.username,
        email: profile.email,
        globalNickname: profile.globalNickname || '',
        avatarUrl: profile.avatarUrl || profile.profilePictureUrl || ''
      };
      originalProfile.value = { ...data };
      profileForm.value = { ...data };
      previewAvatar.value = data.avatarUrl;
    }
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to load profile'
    });
  }
};

const handleAvatarUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  
  try {
    avatarUploading.value = true;
    uploadProgress.value = 0;
    
    // Upload avatar
    const uploadResult = await uploadService.uploadAvatar(file, {
      onProgress: (progress) => {
        uploadProgress.value = progress.percentage;
      }
    });
    
    // Update form and preview
    profileForm.value.avatarUrl = uploadResult.url;
    previewAvatar.value = uploadResult.url;
    
    addToast({
      type: 'success',
      message: 'Avatar uploaded successfully'
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to upload avatar'
    });
  } finally {
    avatarUploading.value = false;
    uploadProgress.value = 0;
    input.value = ''; // Reset input
  }
};

const handleRemoveAvatar = async () => {
  try {
    removingAvatar.value = true;
    
    // Delete avatar on backend
    await uploadService.deleteAvatar();
    
    // Update form and preview
    profileForm.value.avatarUrl = '';
    previewAvatar.value = '';
    
    addToast({
      type: 'success',
      message: 'Avatar removed successfully'
    });
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to remove avatar'
    });
  } finally {
    removingAvatar.value = false;
  }
};

const handleUpdateProfile = async () => {
  if (!hasChanges.value) return;
  
  try {
    loading.value = true;
    
    const payload: UpdateProfilePayload = {
      username: profileForm.value.username,
      email: profileForm.value.email,
      globalNickname: profileForm.value.globalNickname || undefined,
      avatarUrl: profileForm.value.avatarUrl || undefined
    };
    
    await userService.updateProfile(payload);
    
    // Update auth store
    authStore.updateUserData({
      username: payload.username,
      email: payload.email,
      globalNickname: payload.globalNickname,
      avatarUrl: payload.avatarUrl
    });
    
    // Update original values
    originalProfile.value = { ...profileForm.value };
    
    addToast({
      type: 'success',
      message: 'Profile updated successfully'
    });
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to update profile'
    });
  } finally {
    loading.value = false;
  }
};

const handleChangePassword = async () => {
  if (!isPasswordFormValid.value) return;
  
  try {
    changingPassword.value = true;
    
    const payload: UpdatePasswordPayload = {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    };
    
    await userService.updatePassword(payload);
    
    // Reset form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    
    addToast({
      type: 'success',
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.response?.data?.message || 'Failed to change password'
    });
  } finally {
    changingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  try {
    deletingAccount.value = true;
    
    await userService.deleteAccount();
    
    addToast({
      type: 'success',
      message: 'Account deleted successfully'
    });
    
    // Logout and redirect
    authStore.logout();
    router.push({ name: 'Login' });
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to delete account'
    });
  } finally {
    deletingAccount.value = false;
    showDeleteConfirm.value = false;
  }
};

const resetForm = () => {
  profileForm.value = { ...originalProfile.value };
  previewAvatar.value = originalProfile.value.avatarUrl;
};

// Load profile on mount
onMounted(() => {
  loadProfile();
});
</script>