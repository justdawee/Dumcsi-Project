<template>
  <div class="h-full w-full text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">

      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <User class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sections.myAccount') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.account.subtitle') }}</p>
        </div>
      </header>

      <!-- Account Information -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden mb-8">
        <div class="p-6 border-b border-border-default">
          <h2 class="text-lg font-semibold leading-6">{{ t('settings.account.info.title') }}</h2>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.account.info.subtitle') }}</p>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            <div>
              <label class="form-label">{{ t('settings.profile.fields.username') }}</label>
              <div class="form-input-disabled">{{ authStore.user?.username }}</div>
            </div>
            <div>
              <label class="form-label">{{ t('settings.account.email') }}</label>
              <div class="form-input-disabled">{{ authStore.user?.email }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Password Change Section Card -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden mb-8">
        <form @submit.prevent="handleChangePassword">
          <div class="p-6 border-b border-border-default">
            <h2 class="text-lg font-semibold leading-6">{{ t('settings.account.password.title') }}</h2>
            <p class="mt-1 text-sm text-text-muted">{{ t('settings.account.password.hint') }}</p>
          </div>
          <div class="p-6 space-y-6 max-w-md">
            <div>
              <label class="form-label" for="current-password">{{ t('settings.account.password.current') }}</label>
              <input id="current-password" v-model="passwordForm.currentPassword" class="form-input" required
                     type="password"/>
            </div>
            <div>
              <label class="form-label" for="new-password">{{ t('settings.account.password.new') }}</label>
              <input id="new-password" v-model="passwordForm.newPassword" class="form-input" required type="password"/>
              <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
            </div>
            <div>
              <label class="form-label" for="confirm-password">{{ t('settings.account.password.confirmNew') }}</label>
              <input id="confirm-password" v-model="passwordForm.confirmPassword" class="form-input" required
                     type="password"/>
            </div>
          </div>
          <div class="bg-bg-base/40 px-6 py-4 flex items-center justify-end">
            <button :disabled="!canChangePassword || changingPassword" class="btn-primary" type="submit">
              <span v-if="!changingPassword">{{ t('settings.account.password.update') }}</span>
              <span v-else class="flex items-center">
                <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5"/>
                {{ t('settings.account.password.updating') }}
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Danger Zone Section -->
      <div class="mt-8 p-4 bg-danger/20 border border-danger/30 rounded-2xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-default">{{ t('settings.account.delete.title') }}</p>
            <p class="text-sm text-text-muted">{{ t('settings.account.delete.warning') }}</p>
          </div>
          <button class="btn-danger flex-shrink-0" @click="showDeleteConfirm = true">
            {{ t('settings.account.delete.button') }}
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- Modals -->
  <ConfirmModal
      v-model="showDeleteConfirm"
      :is-loading="deletingAccount"
      :confirm-text="t('settings.account.delete.button')"
      intent="danger"
      :message="t('settings.account.delete.message')"
      :title="t('settings.account.delete.title')"
      @confirm="handleDeleteAccount"
  />
</template>

<script lang="ts" setup>
import {ref, computed, reactive} from 'vue';
import {useAuthStore} from '@/stores/auth';
import {useToast} from '@/composables/useToast';
import userService from '@/services/userService';
import {User, Loader2} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import type {ChangePasswordDto} from '@/services/types';
import {getDisplayMessage} from '@/services/errorHandler';

// Composables
const authStore = useAuthStore();
const {addToast} = useToast();
const { t } = useI18n();

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
    return t('settings.account.password.minLength');
  }
  if (passwordForm.newPassword && passwordForm.confirmPassword &&
      passwordForm.newPassword !== passwordForm.confirmPassword) {
    return t('settings.account.password.mismatch');
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
    addToast({type: 'success', message: t('settings.account.password.changed')});
  } catch (error: any) {
    addToast({type: 'danger', message: getDisplayMessage(error) || t('settings.account.password.changeFailed')});
  } finally {
    changingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  deletingAccount.value = true;
  try {
    await userService.deleteAccount();
    await authStore.logout();
    addToast({type: 'info', message: t('settings.account.delete.deleted')});
  } catch (error: any) {
    addToast({type: 'danger', message: getDisplayMessage(error) || t('settings.account.delete.failed')});
  } finally {
    deletingAccount.value = false;
    showDeleteConfirm.value = false;
  }
};
</script>
