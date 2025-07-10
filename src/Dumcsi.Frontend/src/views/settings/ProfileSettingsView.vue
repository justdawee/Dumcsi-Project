<template>
  <!-- Main container with vertical scroll -->
  <div class="flex-1 p-4 sm:p-8 bg-gray-900 text-white overflow-y-auto">
    <div class="max-w-4xl mx-auto">

      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <UserCircle class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">User Settings</h1>
          <p class="mt-1 text-sm text-gray-400">Manage your account and preferences</p>
        </div>
      </header>

      <!-- Profile Information Section Card -->
      <div
          class="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden mb-8">
        <form @submit.prevent="handleUpdateProfile">
          <!-- Card Header -->
          <div class="p-6 border-b border-gray-700/50">
            <h2 class="text-lg font-semibold leading-6">Profile Information</h2>
            <p class="mt-1 text-sm text-gray-400">This information may be visible to other users.</p>
          </div>

          <!-- Card Body -->
          <div class="p-6 space-y-6">
            <!-- Avatar -->
            <div class="flex items-center gap-x-6">
              <div class="relative group w-32 h-32 flex-shrink-0">
                <UserAvatar
                    :avatar-url="previewAvatar || profileForm.avatar"
                    :username="profileForm.username"
                    :size="128"
                    class="ring-4 ring-gray-700/50"
                />
                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed"
                >
                  <button
                      type="button"
                      @click="fileInput?.click()"
                      :disabled="avatarUploading"
                      class="w-full h-full flex flex-col items-center justify-center text-white"
                  >
                    <Camera v-if="!avatarUploading" class="w-10 h-10"/>
                    <Loader2 v-else class="w-10 h-10 animate-spin"/>
                    <span class="text-xs font-semibold mt-1">Change</span>
                  </button>
                </div>
                <input
                    ref="fileInput"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    class="hidden"
                    @change="handleAvatarSelect"
                />
              </div>
              <div>
                <h3 class="text-lg font-semibold">Profile Photo</h3>
                <p class="text-sm text-gray-400 mt-1">Click on the avatar to change it.</p>
                <p class="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 5MB.</p>
              </div>
            </div>

            <!-- Form Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label for="username" class="form-label">Username</label>
                <input :value="profileForm.username" type="text" id="username" class="form-input-disabled" disabled/>
              </div>
              <div>
                <label for="email" class="form-label">Email Address</label>
                <input :value="profileForm.email" type="email" id="email" class="form-input-disabled" disabled/>
              </div>
              <div class="sm:col-span-2">
                <label for="globalNickname" class="form-label">Display Name</label>
                <input v-model="profileForm.globalNickname" type="text" id="globalNickname" class="form-input"
                       placeholder="How you appear to others"/>
              </div>
            </div>
          </div>

          <!-- Card Footer with Actions -->
          <div class="bg-gray-900/40 px-6 py-4 flex items-center justify-end gap-4">
            <transition name="fade">
              <p v-if="hasChanges" class="text-sm font-medium text-yellow-400 mr-auto">
                You have unsaved changes.
              </p>
            </transition>
            <button type="button" @click="resetProfileForm" :disabled="!hasChanges || loading" class="btn-secondary">
              Cancel
            </button>
            <button :disabled="!hasChanges || loading" type="submit" class="btn-primary">
              <span v-if="!loading">Save Changes</span>
              <span v-else class="flex items-center">
                <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5"/>
                Saving...
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Password Change Section Card -->
      <div
          class="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden mb-8">
        <form @submit.prevent="handleChangePassword">
          <div class="p-6 border-b border-gray-700/50">
            <h2 class="text-lg font-semibold leading-6">Change Password</h2>
            <p class="mt-1 text-sm text-gray-400">For your security, we recommend using a strong password.</p>
          </div>
          <div class="p-6 space-y-6">
            <div>
              <label for="current-password" class="form-label">Current Password</label>
              <input v-model="passwordForm.currentPassword" type="password" id="current-password" class="form-input"
                     required/>
            </div>
            <div>
              <label for="new-password" class="form-label">New Password</label>
              <input v-model="passwordForm.newPassword" type="password" id="new-password" class="form-input" required/>
              <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
            </div>
            <div>
              <label for="confirm-password" class="form-label">Confirm New Password</label>
              <input v-model="passwordForm.confirmPassword" type="password" id="confirm-password" class="form-input"
                     required/>
            </div>
          </div>
          <div class="bg-gray-900/40 px-6 py-4 flex items-center justify-end">
            <button :disabled="!canChangePassword || changingPassword" type="submit" class="btn-primary">
              <span v-if="!changingPassword">Update Password</span>
              <span v-else class="flex items-center">
                      <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5"/>
                      Updating...
                  </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Danger Zone Section -->
      <div class="mt-8 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-white">Delete your account</p>
            <p class="text-sm text-gray-400">Once you delete your account, there is no going back.</p>
          </div>
          <button @click="showDeleteConfirm = true" class="btn-danger flex-shrink-0">
            Delete Account
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- Modals -->
  <ConfirmModal
      v-model="showDeleteConfirm"
      title="Delete Account"
      message="Are you absolutely sure you want to delete your account? All of your servers and messages will be permanently removed. This action cannot be undone!"
      confirm-text="Delete Account"
      :is-loading="deletingAccount"
      @confirm="handleDeleteAccount"
      intent="danger"
  />
</template>

<script setup lang="ts">
import {ref, computed, onMounted, reactive} from 'vue';
import {useRouter} from 'vue-router';
import {useAuthStore} from '@/stores/auth';
import {useToast} from '@/composables/useToast';
import userService from '@/services/userService';
import uploadService from '@/services/uploadService';
import {Camera, Loader2, UserCircle} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type {UpdateUserProfileRequest, ChangePasswordRequest, UserProfileDto} from '@/services/types';

// Composables
const router = useRouter();
const authStore = useAuthStore();
const {addToast} = useToast();

// State
const loading = ref(false);
const avatarUploading = ref(false);
const uploadProgress = ref(0);
const changingPassword = ref(false);
const deletingAccount = ref(false);
const showDeleteConfirm = ref(false);
const fileInput = ref<HTMLInputElement>();
const previewAvatar = ref<string | null>(null);

// Form state
const originalProfile = reactive<Partial<UserProfileDto>>({});
const profileForm = reactive({
  username: '',
  email: '',
  globalNickname: '',
  avatar: ''
});
const passwordForm = reactive<ChangePasswordRequest & { confirmPassword: '' }>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Computed
const hasChanges = computed(() => {
  return profileForm.globalNickname !== (originalProfile.globalNickname || '') ||
      profileForm.avatar !== (originalProfile.avatar || '');
});

const passwordError = computed(() => {
  if (passwordForm.newPassword && passwordForm.newPassword.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (passwordForm.newPassword && passwordForm.confirmPassword &&
      passwordForm.newPassword !== passwordForm.confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
});

const canChangePassword = computed(() => {
  return passwordForm.currentPassword &&
      passwordForm.newPassword.length >= 8 &&
      passwordForm.newPassword === passwordForm.confirmPassword;
});

// Methods
const loadProfile = () => {
  if (authStore.user) {
    const userDto = authStore.user;
    const initialData = {
      username: userDto.username,
      email: userDto.email,
      globalNickname: userDto.globalNickname || '',
      avatar: userDto.avatar || ''
    };
    Object.assign(profileForm, initialData);
    Object.assign(originalProfile, initialData);
  }
};

const resetProfileForm = () => {
  if (previewAvatar.value) {
    URL.revokeObjectURL(previewAvatar.value);
    previewAvatar.value = null;
  }
  Object.assign(profileForm, originalProfile);
};

const handleAvatarSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      throw new Error('Please select a valid image file.');
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be less than 5MB.');

    previewAvatar.value = URL.createObjectURL(file);
    avatarUploading.value = true;
    uploadProgress.value = 0;

    const response = await uploadService.uploadAvatar(file, {
      onProgress: (progress) => {
        uploadProgress.value = progress;
      }
    });

    profileForm.avatar = response.url;

  } catch (error: any) {
    addToast({type: 'danger', message: error.message || 'Failed to upload avatar'});
    resetProfileForm();
  } finally {
    avatarUploading.value = false;
    uploadProgress.value = 0;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const handleUpdateProfile = async () => {
  if (!hasChanges.value) return;

  loading.value = true;
  try {
    const payload: UpdateUserProfileRequest = {
      username: profileForm.username,
      email: profileForm.email,
      globalNickname: profileForm.globalNickname || null,
      avatar: profileForm.avatar || null
    };

    await userService.updateProfile(payload);
    await authStore.fetchUserProfile();
    loadProfile();

    if (previewAvatar.value) {
      URL.revokeObjectURL(previewAvatar.value);
      previewAvatar.value = null;
    }

    addToast({type: 'success', message: 'Profile updated successfully'});
  } catch (error: any) {
    addToast({type: 'danger', message: error.message || 'Failed to update profile'});
  } finally {
    loading.value = false;
  }
};

const handleChangePassword = async () => {
  if (!canChangePassword.value) return;

  changingPassword.value = true;
  try {
    await userService.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });

    Object.assign(passwordForm, {currentPassword: '', newPassword: '', confirmPassword: ''});
    addToast({type: 'success', message: 'Password changed successfully'});
  } catch (error: any) {
    addToast({type: 'danger', message: error.message || 'Failed to change password'});
  } finally {
    changingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  deletingAccount.value = true;
  try {
    await userService.deleteAccount();
    await authStore.logout();
    addToast({type: 'info', message: 'Your account has been deleted'});
  } catch (error: any) {
    addToast({type: 'danger', message: error.message || 'Failed to delete account'});
  } finally {
    deletingAccount.value = false;
    showDeleteConfirm.value = false;
  }
};

// Lifecycle
onMounted(loadProfile);
</script>

<style scoped>
@reference "@/style.css";

.form-label {
  @apply block text-sm font-medium text-gray-400 mb-1;
}

.form-input {
  @apply block w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition;
}

.form-input-disabled {
  @apply block w-full px-3 py-2 bg-gray-700/30 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed;
}

.form-error {
  @apply mt-1 text-xs text-red-400;
}

.btn-primary {
  @apply inline-flex justify-center items-center py-2 px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold rounded-lg transition-colors duration-200;
}

.btn-secondary {
  @apply inline-flex justify-center items-center py-2 px-4 bg-gray-700/60 border border-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-danger {
  @apply inline-flex justify-center items-center py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-semibold rounded-lg transition-colors duration-200;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
