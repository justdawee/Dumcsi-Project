<template>
  <div class="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8">
    <div class="max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-3xl font-bold tracking-tight text-white">My Profile</h1>
        <p class="mt-1 text-sm text-gray-400">Manage your profile, password, and account settings.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Bal oldali oszlop: Profil és Jelszó -->
        <div class="md:col-span-2 space-y-8">
          <!-- Profile Section -->
          <div class="bg-gray-800 rounded-lg shadow-lg">
            <div class="p-6 border-b border-gray-700">
              <h2 class="text-xl font-semibold text-white">Profile Information</h2>
            </div>
            <form @submit.prevent="handleUpdateProfile" class="p-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Avatar Upload -->
                <div class="lg:col-span-1">
                  <label class="block text-sm font-medium text-gray-300 mb-2">Profile Photo</label>
                  <div class="relative group w-24 h-24">
                    <UserAvatar
                      :avatar-url="previewAvatar || authStore.user?.avatar"
                      :username="authStore.user?.username || ''"
                      :size="96"
                      class="ring-4 ring-gray-700"
                    />
                    <button
                      type="button"
                      @click="fileInput?.click()"
                      :disabled="avatarUploading"
                      class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition disabled:cursor-not-allowed"
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
                  <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mt-2 w-24">
                    <div class="w-full bg-gray-700 rounded-full h-1.5">
                      <div class="bg-primary h-1.5 rounded-full transition-all" :style="{ width: `${uploadProgress}%` }"/>
                    </div>
                  </div>
                </div>
                
                <!-- Form Fields -->
                <div class="lg:col-span-2 space-y-4">
                  <div>
                    <label for="username" class="form-label">Username</label>
                    <input id="username" type="text" :value="profileForm.username" disabled class="form-input-disabled" />
                  </div>
                  <div>
                    <label for="email" class="form-label">Email</label>
                    <input id="email" type="email" :value="profileForm.email" disabled class="form-input-disabled" />
                  </div>
                  <div>
                    <label for="globalNickname" class="form-label">Display Name</label>
                    <input id="globalNickname" v-model="profileForm.globalNickname" type="text" placeholder="How you appear to others" maxlength="32" class="form-input" />
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-700">
                 <span v-if="hasChanges" class="text-sm text-yellow-400 mr-auto">Unsaved changes</span>
                 <button type="button" @click="resetProfileForm" :disabled="!hasChanges || loading" class="btn-secondary">Cancel</button>
                 <button type="submit" :disabled="!hasChanges || loading" class="btn-primary">
                   <Loader2 v-if="loading" class="w-4 h-4 animate-spin mr-2" />
                   Save Changes
                 </button>
              </div>
            </form>
          </div>

          <!-- Password Section -->
          <div class="bg-gray-800 rounded-lg shadow-lg">
            <div class="p-6 border-b border-gray-700">
              <h2 class="text-xl font-semibold text-white">Change Password</h2>
            </div>
            <form @submit.prevent="handleChangePassword" class="p-6 space-y-4">
              <div>
                <label for="currentPassword" class="form-label">Current Password</label>
                <input id="currentPassword" v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" class="form-input" />
              </div>
              <div>
                <label for="newPassword" class="form-label">New Password</label>
                <input id="newPassword" v-model="passwordForm.newPassword" type="password" autocomplete="new-password" class="form-input" />
                <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
              </div>
              <div>
                <label for="confirmPassword" class="form-label">Confirm New Password</label>
                <input id="confirmPassword" v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" class="form-input" />
              </div>
              <div class="flex justify-end pt-4">
                <button type="submit" :disabled="!canChangePassword || changingPassword" class="btn-primary">
                  <Loader2 v-if="changingPassword" class="w-4 h-4 animate-spin mr-2" />
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Jobb oldali oszlop: Danger Zone -->
        <div class="md:col-span-1">
          <div class="bg-red-900/20 border border-red-900/50 rounded-lg p-6">
            <h2 class="text-xl font-semibold text-red-400 mb-2">Danger Zone</h2>
            <p class="text-gray-300 text-sm mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button @click="showDeleteConfirm = true" class="w-full btn-danger">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modális ablak a törlés megerősítéséhez -->
    <ConfirmModal
      v-model="showDeleteConfirm"
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
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import userService from '@/services/userService';
import uploadService from '@/services/uploadService';
import { Camera, Loader2 } from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type { UpdateUserProfileRequest, ChangePasswordRequest, UserProfileDto } from '@/services/types';

// Composables
const router = useRouter();
const authStore = useAuthStore();
const { addToast } = useToast();

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
const profileForm = reactive<Partial<UserProfileDto>>({
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
  return profileForm.globalNickname !== originalProfile.globalNickname ||
         profileForm.avatar !== originalProfile.avatar;
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
    Object.assign(originalProfile, authStore.user);
    Object.assign(profileForm, authStore.user);
  }
};

const resetProfileForm = () => {
  if (previewAvatar.value) {
    URL.revokeObjectURL(previewAvatar.value);
    previewAvatar.value = null;
  }
  Object.assign(profileForm, originalProfile);
}

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
      onProgress: (progress) => { uploadProgress.value = progress; }
    });
    
    profileForm.avatar = response.url;
    
  } catch (error: any) {
    addToast({ type: 'danger', message: error.message || 'Failed to upload avatar' });
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
      username: profileForm.username!,
      email: profileForm.email!,
      globalNickname: profileForm.globalNickname || null,
      avatar: profileForm.avatar || null
    };
    
    await userService.updateProfile(payload);
    await authStore.fetchUserProfile();
    loadProfile(); // Frissíti az originalProfile-t is
    
    if (previewAvatar.value) {
      URL.revokeObjectURL(previewAvatar.value);
      previewAvatar.value = null;
    }
    
    addToast({ type: 'success', message: 'Profile updated successfully' });
  } catch (error: any) {
    addToast({ type: 'danger', message: error.message || 'Failed to update profile' });
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
    
    Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' });
    addToast({ type: 'success', message: 'Password changed successfully' });
  } catch (error: any) {
    addToast({ type: 'danger', message: error.message || 'Failed to change password' });
  } finally {
    changingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  deletingAccount.value = true;
  try {
    await userService.deleteAccount();
    await authStore.logout();
    addToast({ type: 'info', message: 'Your account has been deleted' });
  } catch (error: any) {
    addToast({ type: 'danger', message: error.message || 'Failed to delete account' });
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
.form-label { @apply block text-sm font-medium text-gray-400 mb-1; }
.form-input { @apply block w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition; }
.form-input-disabled { @apply block w-full px-3 py-2 bg-gray-700/30 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed; }
.form-error { @apply mt-1 text-xs text-red-400; }

.btn-primary { @apply inline-flex justify-center items-center py-2 px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold rounded-lg transition-colors duration-200; }
.btn-secondary { @apply inline-flex justify-center items-center py-2 px-4 bg-gray-700/60 border border-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed; }
.btn-danger { @apply inline-flex justify-center items-center py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-semibold rounded-lg transition-colors duration-200; }
</style>
