<template>
  <!-- Main container with vertical scroll -->
  <div class="h-full w-full bg-gradient-to-br from-bg-base via-bg-base to-bg-surface/20 text-text-default overflow-y-auto scrollbar-thin">
    <!-- Content Container -->
    <div class="max-w-4xl mx-auto p-4 sm:p-8">

      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <User class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">My Account</h1>
          <p class="mt-1 text-sm text-text-muted">Manage your account settings and security</p>
        </div>
      </header>

      <!-- Account Information -->
      <div class="bg-bg-surface/50 backdrop-blur-md rounded-2xl shadow-2xl border border-border-default/50 overflow-hidden mb-8">
        <div class="p-6 border-b border-border-default/50">
          <h2 class="text-lg font-semibold leading-6">Account Information</h2>
          <p class="mt-1 text-sm text-text-muted">Your basic account details</p>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            <div>
              <label class="form-label">Username</label>
              <div class="form-input-disabled">{{ authStore.user?.username }}</div>
            </div>
            <div>
              <label class="form-label">Email Address</label>
              <div class="form-input-disabled">{{ authStore.user?.email }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Password Change Section Card -->
      <div class="bg-bg-surface/50 backdrop-blur-md rounded-2xl shadow-2xl border border-border-default/50 overflow-hidden mb-8">
        <form @submit.prevent="handleChangePassword">
          <div class="p-6 border-b border-border-default/50">
            <h2 class="text-lg font-semibold leading-6">Change Password</h2>
            <p class="mt-1 text-sm text-text-muted">For your security, we recommend using a strong password.</p>
          </div>
          <div class="p-6 space-y-6 max-w-md">
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
          <div class="bg-bg-base/40 px-6 py-4 flex items-center justify-end">
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
      <div class="mt-8 p-4 bg-danger/20 border border-danger/30 rounded-2xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-default">Delete your account</p>
            <p class="text-sm text-text-muted">Once you delete your account, there is no going back.</p>
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
import {ref, computed, reactive} from 'vue';
import {useAuthStore} from '@/stores/auth';
import {useToast} from '@/composables/useToast';
import userService from '@/services/userService';
import {User, Loader2} from 'lucide-vue-next';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type {ChangePasswordDto} from '@/services/types';
import {getDisplayMessage} from '@/services/errorHandler';

// Composables
const authStore = useAuthStore();
const {addToast} = useToast();

// State
const changingPassword = ref(false);
const deletingAccount = ref(false);
const showDeleteConfirm = ref(false);

const passwordForm = reactive<ChangePasswordDto & { confirmPassword: '' }>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Computed
const passwordError = computed(() => {
  if (passwordForm.newPassword && passwordForm.newPassword.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (passwordForm.newPassword && passwordForm.confirmPassword &&
      passwordForm.newPassword !== passwordForm.confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
});

const canChangePassword = computed(() => {
  return passwordForm.currentPassword &&
      passwordForm.newPassword.length >= 6 &&
      passwordForm.newPassword === passwordForm.confirmPassword;
});

// Methods
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
    addToast({type: 'danger', message: getDisplayMessage(error) || 'Failed to change password'});
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
    addToast({type: 'danger', message: getDisplayMessage(error) || 'Failed to delete account'});
  } finally {
    deletingAccount.value = false;
    showDeleteConfirm.value = false;
  }
};
</script>