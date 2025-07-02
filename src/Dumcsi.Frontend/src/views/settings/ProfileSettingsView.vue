<template>
  <!-- Main container -->
  <div class="flex-1 p-4 sm:p-8 bg-gray-900 text-white overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
            <UserCircle class="w-7 h-7 text-primary" />
        </div>
        <div>
            <h1 class="text-3xl font-bold tracking-tight">User Settings</h1>
            <p class="mt-1 text-sm text-gray-400">Manage your account and preferences</p>
        </div>
      </header>

      <!-- Profile Information Section Card -->
      <div class="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden mb-8">
        <form @submit.prevent="handleUpdateProfile">
          <!-- Card Header -->
          <div class="p-6 border-b border-gray-700/50">
            <h2 class="text-lg font-semibold leading-6">Profile Information</h2>
            <p class="mt-1 text-sm text-gray-400">This information may be visible to other users.</p>
          </div>
          
          <!-- Card Body -->
          <div class="p-6 space-y-6">
            <!-- Avatar -->
            <div class="flex items-center gap-x-5">
                <UserAvatar
                  :avatar-url="authStore.user?.profilePictureUrl"
                  :username="profileForm.username || authStore.user?.username || ''"
                  :size="80"
                />
                <div>
                    <button type="button" class="btn-secondary">
                        Change Avatar
                    </button>
                    <p class="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 5MB.</p>
                </div>
            </div>

            <!-- Form Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label for="username" class="form-label">Username</label>
                    <input v-model="profileForm.username" type="text" id="username" class="form-input" />
                    <p v-if="profileErrors.username" class="form-error">{{ profileErrors.username }}</p>
                </div>
                <div>
                    <label for="email" class="form-label">Email Address</label>
                    <input v-model="profileForm.email" type="email" id="email" class="form-input" />
                    <p v-if="profileErrors.email" class="form-error">{{ profileErrors.email }}</p>
                </div>
            </div>
            <!-- General Error Message -->
            <div v-if="profileErrors.general" class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-400">
                {{ profileErrors.general }}
            </div>
          </div>
          
          <!-- Card Footer with Actions -->
          <div class="bg-gray-900/40 px-6 py-4 flex items-center justify-between">
            <transition name="fade">
              <p v-if="profileSuccessMessage" class="text-sm font-medium text-green-400">
                ✓ {{ profileSuccessMessage }}
              </p>
            </transition>
            <button :disabled="isProfileLoading" type="submit" class="btn-primary ml-auto">
              <span v-if="!isProfileLoading">Save Changes</span>
              <span v-else class="flex items-center">
                <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5" />
                Saving...
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Password Change Section Card -->
      <div class="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
         <form @submit.prevent="handleUpdatePassword">
            <div class="p-6 border-b border-gray-700/50">
               <h2 class="text-lg font-semibold leading-6">Change Password</h2>
               <p class="mt-1 text-sm text-gray-400">For your security, we recommend using a strong password.</p>
            </div>
            <div class="p-6 space-y-6">
                <div>
                   <label for="current-password" class="form-label">Current Password</label>
                   <input v-model="passwordForm.currentPassword" type="password" id="current-password" class="form-input" required />
                   <p v-if="passwordErrors.currentPassword" class="form-error">{{ passwordErrors.currentPassword }}</p>
                </div>
                <div>
                   <label for="new-password" class="form-label">New Password</label>
                   <input v-model="passwordForm.newPassword" type="password" id="new-password" class="form-input" required />
                   <p v-if="passwordErrors.newPassword" class="form-error">{{ passwordErrors.newPassword }}</p>
                </div>
            </div>
            <div class="bg-gray-900/40 px-6 py-4 flex items-center justify-between">
                <transition name="fade">
                    <p v-if="passwordSuccessMessage" class="text-sm font-medium text-green-400">
                        ✓ {{ passwordSuccessMessage }}
                    </p>
                </transition>
                <button :disabled="isPasswordLoading" type="submit" class="btn-primary ml-auto">
                    <span v-if="!isPasswordLoading">Update Password</span>
                    <span v-else class="flex items-center">
                        <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Updating...
                    </span>
                </button>
            </div>
         </form>
      </div>
      <!-- Danger Zone szekció -->
      <div class="mt-8 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-white">Delete your account</p>
            <p class="text-sm text-gray-400">Once you delete your account, there is no going back.</p>
          </div>
          <button @click="isDeleteModalOpen = true" class="btn-danger flex-shrink-0">
            Delete Account
          </button>
        </div>
      </div>

    </div>
  </div>
  <!-- A megerősítő modális ablak hívása -->
  <ConfirmModal
    v-model="isDeleteModalOpen"
    title="Delete Account"
    message="Are you absolutely sure you want to delete your account? All of your servers and messages will be permanently removed. 
    
    This action cannot be undone!"
    confirm-text="Delete Account"
    :is-loading="isDeleting"
    @confirm="handleDeleteAccount"
    intent="danger"
  />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { UserCircle, Loader2 } from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import userService from '@/services/userService';
import type { UpdateProfilePayload, UpdatePasswordPayload } from '@/services/types';

// --- Általános beállítások ---
const authStore = useAuthStore();

// --- Profilfrissítés State ---
const isProfileLoading = ref(false);
const profileSuccessMessage = ref('');
const profileErrors = reactive<Record<string, string>>({});
const profileForm = reactive<UpdateProfilePayload>({
  username: '',
  email: ''
});

// --- Jelszófrissítés State ---
const isPasswordLoading = ref(false);
const passwordSuccessMessage = ref('');
const passwordErrors = reactive<Record<string, string>>({});
const passwordForm = reactive<UpdatePasswordPayload>({
  currentPassword: '',
  newPassword: ''
});

// --- State a fióktörléshez ---
const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);


// --- Adatok betöltése ---
onMounted(async () => {
  if (authStore.user) {
    profileForm.username = authStore.user.username;
  }
  try {
    const response = await userService.getProfile();
    profileForm.username = response.data.username;
    profileForm.email = response.data.email;
    
    if (authStore.user) {
      authStore.user.username = response.data.username;
      authStore.user.profilePictureUrl = response.data.profilePictureUrl;
    }

  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    profileErrors.general = "Could not load profile data. Please refresh the page.";
  }
});

// --- Profilfrissítés Logika ---
const validateProfile = (): boolean => {
  Object.keys(profileErrors).forEach(key => delete profileErrors[key]);
  let isValid = true;
  if (profileForm.username.length < 3 || profileForm.username.length > 20) {
    profileErrors.username = 'Username must be between 3 and 20 characters.';
    isValid = false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
    profileErrors.email = 'Please enter a valid email address.';
    isValid = false;
  }
  return isValid;
};

const handleUpdateProfile = async () => {
  profileSuccessMessage.value = '';
  if (!validateProfile()) return;

  isProfileLoading.value = true;
  try {
    await userService.updateProfile(profileForm);
    if (authStore.user) {
        authStore.user.username = profileForm.username;
    }
    profileSuccessMessage.value = 'Profile updated successfully!';
    setTimeout(() => profileSuccessMessage.value = '', 3000);
  } catch (error: any) {
    if (error.response?.status === 409) { // Conflict
      profileErrors.general = 'This username or email is already taken.';
    } else {
      profileErrors.general = 'An unexpected error occurred.';
    }
  } finally {
    isProfileLoading.value = false;
  }
};

// --- Jelszófrissítés Logika ---
const validatePassword = (): boolean => {
    Object.keys(passwordErrors).forEach(key => delete passwordErrors[key]);
    let isValid = true;
    if (passwordForm.newPassword.length < 6) {
        passwordErrors.newPassword = 'New password must be at least 6 characters.';
        isValid = false;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
        passwordErrors.newPassword = 'New password cannot be the same as the current one.';
        isValid = false;
    }
    return isValid;
}

const handleUpdatePassword = async () => {
    passwordSuccessMessage.value = '';
    if (!validatePassword()) return;

    isPasswordLoading.value = true;
    try {
        await userService.updatePassword(passwordForm);
        passwordSuccessMessage.value = 'Password updated successfully!';
        passwordForm.currentPassword = '';
        passwordForm.newPassword = '';
        setTimeout(() => passwordSuccessMessage.value = '', 3000);
    } catch (error: any) {
        if (error.response?.status === 400) {
            passwordErrors.currentPassword = 'The current password you entered is incorrect.';
        } else {
            passwordErrors.currentPassword = 'An unexpected error occurred.';
        }
    } finally {
        isPasswordLoading.value = false;
    }
};

// --- Fióktörlés logika ---
const handleDeleteAccount = async () => {
  isDeleting.value = true;
  try {
    await userService.deleteAccount();
    await authStore.logout();
  } catch (error) {
    console.error('Failed to delete account:', error);
    isDeleteModalOpen.value = false;
    profileErrors.general = 'Failed to delete account. Please try again later.';
  } finally {
    isDeleting.value = false;
  }
};
</script>