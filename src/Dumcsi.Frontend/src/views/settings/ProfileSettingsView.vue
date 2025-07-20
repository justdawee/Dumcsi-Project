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
                    :size="128"
                    :username="profileForm.username"
                    class="ring-4 ring-gray-700/50"
                />
                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed"
                >
                  <button
                      :disabled="avatarUploading"
                      class="w-full h-full flex flex-col items-center justify-center text-white"
                      type="button"
                      @click="fileInput?.click()"
                  >
                    <Camera v-if="!avatarUploading" class="w-10 h-10"/>
                    <Loader2 v-else class="w-10 h-10 animate-spin"/>
                    <span class="text-xs font-semibold mt-1">Change</span>
                  </button>
                </div>
                <input
                    ref="fileInput"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    class="hidden"
                    type="file"
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
                <label class="form-label" for="username">Username</label>
                <input id="username" :value="profileForm.username" class="form-input-disabled" disabled type="text"/>
              </div>
              <div>
                <label class="form-label" for="email">Email Address</label>
                <input id="email" :value="profileForm.email" class="form-input-disabled" disabled type="email"/>
              </div>
              <div class="sm:col-span-2">
                <label class="form-label" for="globalNickname">Display Name</label>
                <input id="globalNickname" v-model="profileForm.globalNickname" class="form-input"
                       placeholder="How you appear to others"
                       type="text"/>
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
            <button :disabled="!hasChanges || loading" class="btn-secondary" type="button" @click="resetProfileForm">
              Cancel
            </button>
            <button :disabled="!hasChanges || loading" class="btn-primary" type="submit">
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
              <label class="form-label" for="current-password">Current Password</label>
              <input id="current-password" v-model="passwordForm.currentPassword" class="form-input" required
                     type="password"/>
            </div>
            <div>
              <label class="form-label" for="new-password">New Password</label>
              <input id="new-password" v-model="passwordForm.newPassword" class="form-input" required type="password"/>
              <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
            </div>
            <div>
              <label class="form-label" for="confirm-password">Confirm New Password</label>
              <input id="confirm-password" v-model="passwordForm.confirmPassword" class="form-input" required
                     type="password"/>
            </div>
          </div>
          <div class="bg-gray-900/40 px-6 py-4 flex items-center justify-end">
            <button :disabled="!canChangePassword || changingPassword" class="btn-primary" type="submit">
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
          <button class="btn-danger flex-shrink-0" @click="showDeleteConfirm = true">
            Delete Account
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- Modals -->
  <ConfirmModal
      v-model="showDeleteConfirm"
      :is-loading="deletingAccount"
      confirm-text="Delete Account"
      intent="danger"
      message="Are you absolutely sure you want to delete your account? All of your servers and messages will be permanently removed. This action cannot be undone!"
      title="Delete Account"
      @confirm="handleDeleteAccount"
  />
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, reactive} from 'vue';
import {useAuthStore} from '@/stores/auth';
import {useToast} from '@/composables/useToast';
import userService from '@/services/userService';
import uploadService from '@/services/uploadService';
import {Camera, Loader2, UserCircle} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type {UserProfileDto} from '@/services/types';
import {getDisplayMessage} from "@/services/errorHandler.ts";

// Composables
const authStore = useAuthStore();
const {addToast} = useToast();

// State
const loading = ref(false);
const avatarUploading = ref(false);
const changingPassword = ref(false);
const deletingAccount = ref(false);
const showDeleteConfirm = ref(false);
const fileInput = ref<HTMLInputElement>();
const previewAvatar = ref<string | null>(null);
const selectedAvatarFile = ref<File | null>(null);

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
      !!selectedAvatarFile.value;
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
  selectedAvatarFile.value = null;
  Object.assign(profileForm, originalProfile);
};

const handleAvatarSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      throw {response: {data: {error: {code: 'AVATAR_INVALID_FILE_TYPE'}}}};
    }
    if (file.size > 10 * 1024 * 1024) {
      throw {response: {data: {error: {code: 'AVATAR_FILE_TOO_LARGE'}}}};
    }

    if (previewAvatar.value) {
      URL.revokeObjectURL(previewAvatar.value);
    }

    previewAvatar.value = URL.createObjectURL(file);
    selectedAvatarFile.value = file;

  } catch (error: any) {
    addToast({type: 'danger', message: getDisplayMessage(error)});
    previewAvatar.value = null;
    selectedAvatarFile.value = null;
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
};

const handleUpdateProfile = async () => {
  if (!hasChanges.value) return;

  loading.value = true;
  avatarUploading.value = true;

  try {
    let newAvatarUrl = profileForm.avatar;

    if (selectedAvatarFile.value) {
      const response = await uploadService.uploadAvatar(selectedAvatarFile.value);
      newAvatarUrl = response.url;
    }

    const payload: UpdateUserProfileRequest = {
      username: profileForm.username,
      email: profileForm.email,
      globalNickname: profileForm.globalNickname || null,
      avatar: newAvatarUrl || null
    };

    await userService.updateProfile(payload);
    await authStore.fetchUserProfile();
    loadProfile();

    if (previewAvatar.value) {
      URL.revokeObjectURL(previewAvatar.value);
      previewAvatar.value = null;
    }
    selectedAvatarFile.value = null;

    addToast({type: 'success', message: 'Profile updated successfully'});
  } catch (error: any) {
    addToast({type: 'danger', message: error.message || 'Failed to update profile'});
  } finally {
    loading.value = false;
    avatarUploading.value = false;
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
