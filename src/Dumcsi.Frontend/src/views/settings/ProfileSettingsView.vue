<template>
  <div class="min-h-screen bg-gray-900 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-white mb-8">Profile Settings</h1>

      <!-- Profile Section -->
      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-white mb-6">Profile Information</h2>
        
        <!-- Avatar Upload -->
        <div class="flex items-start gap-6 mb-6">
          <div class="relative group">
            <UserAvatar
              :avatar-url="previewAvatar || getAvatarUrl(authStore.user)"
              :username="authStore.user?.username || ''"
              :size="80"
              class="ring-4 ring-gray-700"
            />
            <button
              @click="fileInput?.click()"
              :disabled="avatarUploading"
              class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition disabled:cursor-not-allowed"
            >
              <Camera v-if="!avatarUploading" class="w-8 h-8 text-white" />
              <Loader2 v-else class="w-8 h-8 text-white animate-spin" />
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              @change="handleAvatarSelect"
            />
          </div>
          
          <div class="flex-1">
            <p class="text-sm text-gray-400 mb-2">
              We recommend an image of at least 128x128 for best results.
            </p>
            <div class="flex gap-2">
              <button
                v-if="hasChanges && (previewAvatar || profileForm.avatarUrl !== originalProfile.avatarUrl)"
                @click="resetAvatar"
                class="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition"
              >
                Reset
              </button>
              <button
                v-if="hasCustomAvatar(authStore.user)"
                @click="removeAvatar"
                :disabled="removingAvatar"
                class="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>{{ removingAvatar ? 'Removing...' : 'Remove Avatar' }}</span>
                <Loader2 v-if="removingAvatar" class="w-4 h-4 animate-spin" />
              </button>
            </div>
            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mt-2">
              <div class="w-full bg-gray-700 rounded-full h-2">
                <div 
                  class="bg-primary h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${uploadProgress}%` }"
                />
              </div>
              <p class="text-xs text-gray-400 mt-1">Uploading... {{ uploadProgress }}%</p>
            </div>
          </div>
        </div>

        <!-- Profile Form -->
        <form @submit.prevent="handleUpdateProfile" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              v-model="profileForm.username"
              type="text"
              disabled
              class="w-full px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              v-model="profileForm.email"
              type="email"
              disabled
              class="w-full px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            <input
              v-model="profileForm.globalNickname"
              type="text"
              placeholder="How should we display your name?"
              maxlength="32"
              class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">
              This is how your name appears across all servers. Leave empty to use your username.
            </p>
          </div>

          <div class="flex items-center justify-between pt-4">
            <div class="text-sm text-gray-400">
              <span v-if="hasChanges">You have unsaved changes</span>
            </div>
            <button
              type="submit"
              :disabled="!hasChanges || loading"
              class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{{ loading ? 'Saving...' : 'Save Changes' }}</span>
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            </button>
          </div>
        </form>
      </div>

      <!-- Password Section -->
      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-white mb-6">Change Password</h2>
        
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              Current Password
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              autocomplete="current-password"
              class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              New Password
            </label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              autocomplete="new-password"
              class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p v-if="passwordError" class="text-xs text-red-400 mt-1">
              {{ passwordError }}
            </p>
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="submit"
              :disabled="!canChangePassword || changingPassword"
              class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{{ changingPassword ? 'Changing...' : 'Change Password' }}</span>
              <Loader2 v-if="changingPassword" class="w-4 h-4 animate-spin" />
            </button>
          </div>
        </form>
      </div>

      <!-- Danger Zone -->
      <div class="bg-red-900/20 border border-red-900/50 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
        <p class="text-gray-300 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          @click="showDeleteConfirm = true"
          class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Delete Account
        </button>
      </div>
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
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type { UpdateProfilePayload, UpdatePasswordPayload } from '@/services/types';

// Composables
const router = useRouter();
const authStore = useAuthStore();
const { getDisplayName, getAvatarUrl, hasCustomAvatar } = useUserDisplay();
const { addToast } = useToast();

// State
const loading = ref(false);
const avatarUploading = ref(false);
const uploadProgress = ref(0);
const removingAvatar = ref(false);
const changingPassword = ref(false);
const deletingAccount = ref(false);
const showDeleteConfirm = ref(false);
const fileInput = ref<HTMLInputElement>();

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
  return profileForm.value.globalNickname !== originalProfile.value.globalNickname ||
         profileForm.value.avatarUrl !== originalProfile.value.avatarUrl ||
         previewAvatar.value !== '';
});

const passwordError = computed(() => {
  if (passwordForm.value.newPassword && passwordForm.value.newPassword.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (passwordForm.value.newPassword && passwordForm.value.confirmPassword && 
      passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
});

const canChangePassword = computed(() => {
  return passwordForm.value.currentPassword &&
         passwordForm.value.newPassword &&
         passwordForm.value.confirmPassword &&
         passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
         passwordForm.value.newPassword.length >= 8;
});

// Methods
const loadProfile = () => {
  if (authStore.user) {
    const profile = {
      username: authStore.user.username,
      email: authStore.user.email,
      globalNickname: authStore.user.globalNickname || '',
      avatarUrl: authStore.user.profilePictureUrl || ''
    };
    originalProfile.value = { ...profile };
    profileForm.value = { ...profile };
  }
};

const handleAvatarSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  
  try {
    // Validate file
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      throw new Error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be less than 5MB');
    }
    
    // Show preview
    previewAvatar.value = uploadService.generatePreviewUrl(file);
    
    // Upload avatar
    avatarUploading.value = true;
    uploadProgress.value = 0;
    
    const response = await uploadService.uploadAvatar(file, {
      onProgress: (progress) => {
        uploadProgress.value = progress;
      }
    });
    
    profileForm.value.avatarUrl = response.url;
    
    addToast({
      type: 'success',
      message: 'Avatar uploaded successfully',
      duration: 3000
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to upload avatar',
      duration: 5000
    });
    resetAvatar();
  } finally {
    avatarUploading.value = false;
    uploadProgress.value = 0;
    if (input) input.value = '';
  }
};

const resetAvatar = () => {
  if (previewAvatar.value) {
    uploadService.revokePreviewUrl(previewAvatar.value);
    previewAvatar.value = '';
  }
  profileForm.value.avatarUrl = originalProfile.value.avatarUrl;
};

const removeAvatar = async () => {
  removingAvatar.value = true;
  try {
    profileForm.value.avatarUrl = '';
    await handleUpdateProfile();
  } finally {
    removingAvatar.value = false;
  }
};

const handleUpdateProfile = async () => {
  if (!hasChanges.value && !removingAvatar.value) return;
  
  loading.value = true;
  try {
    const payload: UpdateProfilePayload = {
      globalNickname: profileForm.value.globalNickname || undefined,
      avatarUrl: profileForm.value.avatarUrl || undefined
    };
    
    await userService.updateProfile(payload);
    await authStore.fetchUserProfile();
    
    // Update original values
    originalProfile.value = { ...profileForm.value };
    
    // Clean up preview
    if (previewAvatar.value) {
      uploadService.revokePreviewUrl(previewAvatar.value);
      previewAvatar.value = '';
    }
    
    addToast({
      type: 'success',
      message: 'Profile updated successfully',
      duration: 3000
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to update profile',
      duration: 5000
    });
  } finally {
    loading.value = false;
  }
};

const handleChangePassword = async () => {
  if (!canChangePassword.value) return;
  
  changingPassword.value = true;
  try {
    const payload: UpdatePasswordPayload = {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    };
    
    await userService.updatePassword(payload);
    
    // Clear form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    
    addToast({
      type: 'success',
      message: 'Password changed successfully',
      duration: 3000
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to change password',
      duration: 5000
    });
  } finally {
    changingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  deletingAccount.value = true;
  try {
    await userService.deleteAccount();
    await authStore.logout();
    
    addToast({
      type: 'info',
      message: 'Your account has been deleted',
      duration: 5000
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to delete account',
      duration: 5000
    });
  } finally {
    deletingAccount.value = false;
    showDeleteConfirm.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadProfile();
});
</script>