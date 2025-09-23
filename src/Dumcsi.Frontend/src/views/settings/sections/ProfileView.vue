<template>
  <!-- Main container with vertical scroll -->
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">

      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <UserCircle class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.profile.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.profile.subtitle') }}</p>
        </div>
      </header>

      <!-- Profile Information Section Card -->
      <div
          class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden mb-8">
        <form @submit.prevent="handleUpdateProfile">
          <!-- Card Header -->
          <div class="p-6 border-b border-border-default">
            <h2 class="text-lg font-semibold leading-6">{{ t('settings.profile.info.title') }}</h2>
            <p class="mt-1 text-sm text-text-muted">{{ t('settings.profile.info.subtitle') }}</p>
          </div>

          <!-- Card Body -->
          <div class="p-6 space-y-6">
            <!-- Avatar -->
            <div class="flex items-center gap-x-6">
              <div class="relative group w-32 h-32 flex-shrink-0">
                <div class="relative group w-32 h-32 flex-shrink-0 rounded-full ring-4 ring-border-default/50 overflow-hidden">
                  <UserAvatar
                      :avatar-url="previewAvatar || profileForm.avatar"
                      :size="128"
                      :username="profileForm.username"
                  />
                </div>
                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed"
                >
                  <button
                      :disabled="avatarUploading"
                      @click="fileInput?.click()"
                      class="flex flex-col items-center justify-center text-text-default"
                      type="button"
                  >
                    <Camera v-if="!avatarUploading" class="w-10 h-10"/>
                    <Loader2 v-else class="w-10 h-10 animate-spin"/>
                    <span class="text-xs font-semibold mt-1">{{ t('settings.profile.avatar.change') }}</span>
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
                <h3 class="text-lg font-semibold">{{ t('settings.profile.avatar.photo') }}</h3>
                <p class="text-sm text-text-muted mt-1">{{ t('settings.profile.avatar.clickToChange') }}</p>
                <p class="text-xs text-text-muted mt-2">{{ t('settings.profile.avatar.hint') }}</p>
              </div>
            </div>

            <!-- Form Fields -->
            <div class="space-y-6">
              <!-- Display Name - Constrained Width -->
              <div class="max-w-md">
                <label class="form-label" for="globalNickname">{{ t('settings.profile.fields.displayName') }}</label>
                <input id="globalNickname" v-model="profileForm.globalNickname" class="form-input"
                       :placeholder="t('settings.profile.fields.displayNamePlaceholder')"
                       type="text"/>
                <p class="mt-2 text-sm text-text-muted">{{ t('settings.profile.fields.displayNameHelp') }}</p>
              </div>
            </div>
          </div>

          <!-- Card Footer with Actions -->
          <div class="bg-bg-base/40 px-6 py-4 flex items-center justify-end gap-4">
            <transition name="fade">
              <p v-if="hasChanges" class="text-sm font-medium text-yellow-400 mr-auto">{{ t('settings.profile.unsaved') }}</p>
            </transition>
            <button :disabled="!hasChanges || loading" class="btn-secondary" type="button" @click="resetProfileForm">{{ t('settings.profile.cancel') }}</button>
            <button :disabled="!hasChanges || loading" class="btn-primary" type="submit">
              <span v-if="!loading">{{ t('settings.profile.save') }}</span>
              <span v-else class="flex items-center">
                <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5"/>
                {{ t('settings.profile.saving') }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, reactive} from 'vue';
import {useAuthStore} from '@/stores/auth';
import {useToast} from '@/composables/useToast';
import userService from '@/services/userService';
import uploadService from '@/services/uploadService';
import {Camera, Loader2, UserCircle} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type {UserProfileDto, UpdateUserProfileDto} from '@/services/types';
import {getDisplayMessage} from "@/services/errorHandler";

// Composables
const authStore = useAuthStore();
const {addToast} = useToast();
const { t } = useI18n();

// State
const loading = ref(false);
const avatarUploading = ref(false);
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

// Computed
const hasChanges = computed(() => {
  return profileForm.globalNickname !== (originalProfile.globalNickname || '') ||
      !!selectedAvatarFile.value;
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
      throw new Error('Invalid file type. Please use a JPG, PNG, GIF, or WEBP image.');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('The avatar image cannot be larger than 8MB.');
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

    const payload: UpdateUserProfileDto = {
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

    addToast({type: 'success', message: t('settings.profile.updated')});
  } catch (error: any) {
    addToast({type: 'danger', message: getDisplayMessage(error) || t('settings.profile.updateFailed')});
  } finally {
    loading.value = false;
    avatarUploading.value = false;
  }
};

// Lifecycle
onMounted(loadProfile);
</script>
