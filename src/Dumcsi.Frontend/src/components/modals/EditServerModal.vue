<template>
  <BaseModal
    :title="`Edit Server - ${server?.name || ''}`"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Server Icon Upload -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Server Icon
        </label>
        <div class="flex items-start gap-4">
          <div class="relative group">
            <ServerAvatar
              :icon-url="previewIcon || form.iconUrl"
              :name="form.name || server?.name || ''"
              :size="64"
              class="ring-2 ring-gray-600"
            />
            <button
              type="button"
              @click="fileInput?.click()"
              :disabled="iconUploading"
              class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition disabled:cursor-not-allowed"
            >
              <Camera v-if="!iconUploading" class="w-6 h-6 text-white" />
              <Loader2 v-else class="w-6 h-6 text-white animate-spin" />
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              @change="handleIconSelect"
            />
          </div>
          
          <div class="flex-1">
            <p class="text-xs text-gray-400 mb-2">
              Upload a server icon. Recommended size: 512x512px
            </p>
            <div class="flex gap-2">
              <button
                v-if="(previewIcon || form.iconUrl !== originalServer?.iconUrl) && !iconUploading"
                type="button"
                @click="resetIcon"
                class="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition"
              >
                Reset
              </button>
              <button
                v-if="(form.iconUrl || originalServer?.iconUrl) && !iconUploading"
                type="button"
                @click="removeIcon"
                :disabled="removingIcon"
                class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ removingIcon ? 'Removing...' : 'Remove Icon' }}
              </button>
            </div>
            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mt-2">
              <div class="w-full bg-gray-700 rounded-full h-1.5">
                <div 
                  class="bg-primary h-1.5 rounded-full transition-all duration-300"
                  :style="{ width: `${uploadProgress}%` }"
                />
              </div>
              <p class="text-xs text-gray-400 mt-1">{{ uploadProgress }}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Server Name -->
      <div>
        <label for="serverName" class="block text-sm font-medium text-gray-300 mb-1">
          Server Name
        </label>
        <input
          id="serverName"
          v-model="form.name"
          type="text"
          required
          maxlength="100"
          class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          placeholder="Enter server name"
        />
      </div>

      <!-- Server Description -->
      <div>
        <label for="serverDescription" class="block text-sm font-medium text-gray-300 mb-1">
          Description <span class="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="serverDescription"
          v-model="form.description"
          rows="3"
          maxlength="1000"
          class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
          placeholder="Tell people what your server is about"
        />
        <p class="text-xs text-gray-500 mt-1">
          {{ form.description.length }}/1000
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-between gap-3 pt-2">
        <button
          v-if="canDeleteServer"
          type="button"
          @click="showDeleteConfirm = true"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Delete Server
        </button>
        
        <div class="flex gap-3 ml-auto">
          <button
            type="button"
            @click="handleClose"
            class="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!hasChanges || isSubmitting || iconUploading"
            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>{{ isSubmitting ? 'Saving...' : 'Save Changes' }}</span>
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>
    </form>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-if="showDeleteConfirm"
      @close="showDeleteConfirm = false"
      @confirm="handleDelete"
      title="Delete Server"
      :message="`Are you sure you want to delete '${server?.name}'? This action cannot be undone and all channels, messages, and members will be permanently removed.`"
      confirm-text="Delete Server"
      :is-loading="isDeleting"
      intent="danger"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import uploadService from '@/services/uploadService';
import { Camera, Loader2 } from 'lucide-vue-next';
import BaseModal from '@/components/ui/BaseModal.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import ServerAvatar from '@/components/common/ServerAvatar.vue';
import type { ServerDetail, UpdateServerPayload, Role } from '@/services/types';

// Props & Emits
const props = defineProps<{
  server: ServerDetail | null;
}>();

const emit = defineEmits<{
  close: [];
  serverUpdated: [server: ServerDetail];
  serverDeleted: [serverId: number];
}>();

// Composables
const appStore = useAppStore();
const authStore = useAuthStore();
const { addToast } = useToast();

// State
const fileInput = ref<HTMLInputElement>();
const isSubmitting = ref(false);
const isDeleting = ref(false);
const showDeleteConfirm = ref(false);
const iconUploading = ref(false);
const removingIcon = ref(false);
const uploadProgress = ref(0);
const previewIcon = ref<string>('');

const originalServer = ref<ServerDetail | null>(null);
const form = ref({
  name: '',
  description: '',
  iconUrl: ''
});

// Computed
const hasChanges = computed(() => {
  if (!originalServer.value) return false;
  return form.value.name !== originalServer.value.name ||
         form.value.description !== originalServer.value.description ||
         form.value.iconUrl !== originalServer.value.iconUrl ||
         previewIcon.value !== '';
});

const canDeleteServer = computed(() => {
  if (!props.server) return false;
  return props.server.ownerId === authStore.user?.id ||
         props.server.currentUserRole === Role.Admin;
});

// Methods
const initializeForm = () => {
  if (props.server) {
    originalServer.value = props.server;
    form.value = {
      name: props.server.name,
      description: props.server.description || '',
      iconUrl: props.server.iconUrl || ''
    };
  }
};

const handleIconSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0 || !props.server) return;
  
  const file = input.files[0];
  
  try {
    // Show preview immediately
    previewIcon.value = uploadService.generatePreviewUrl(file);
    
    // Upload icon
    iconUploading.value = true;
    uploadProgress.value = 0;
    
    const response = await uploadService.uploadServerIcon(props.server.id, file, {
      onProgress: (progress) => {
        uploadProgress.value = progress;
      }
    });
    
    form.value.iconUrl = response.url;
    
    addToast({
      type: 'success',
      message: 'Server icon uploaded successfully',
      duration: 3000
    });
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to upload server icon',
      duration: 5000
    });
    resetIcon();
  } finally {
    iconUploading.value = false;
    uploadProgress.value = 0;
    if (input) input.value = '';
  }
};

const resetIcon = () => {
  if (previewIcon.value) {
    uploadService.revokePreviewUrl(previewIcon.value);
    previewIcon.value = '';
  }
  form.value.iconUrl = originalServer.value?.iconUrl || '';
};

const removeIcon = async () => {
  removingIcon.value = true;
  try {
    form.value.iconUrl = '';
    // The actual removal happens when saving
  } finally {
    removingIcon.value = false;
  }
};

const handleSubmit = async () => {
  if (!hasChanges.value || !props.server) return;
  
  isSubmitting.value = true;
  try {
    const payload: UpdateServerPayload = {
      name: form.value.name,
      description: form.value.description || null,
      iconUrl: form.value.iconUrl || null
    };
    
    await appStore.updateServer(props.server.id, payload);
    
    addToast({
      type: 'success',
      message: 'Server updated successfully',
      duration: 3000
    });
    
    emit('serverUpdated', { ...props.server, ...payload });
    handleClose();
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to update server',
      duration: 5000
    });
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async () => {
  if (!props.server) return;
  
  isDeleting.value = true;
  try {
    await appStore.deleteServer(props.server.id);
    
    addToast({
      type: 'success',
      message: 'Server deleted successfully',
      duration: 3000
    });
    
    emit('serverDeleted', props.server.id);
    handleClose();
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to delete server',
      duration: 5000
    });
  } finally {
    isDeleting.value = false;
    showDeleteConfirm.value = false;
  }
};

const handleClose = () => {
  if (previewIcon.value) {
    uploadService.revokePreviewUrl(previewIcon.value);
  }
  emit('close');
};

// Watchers
watch(() => props.server, (newServer) => {
  if (newServer) {
    initializeForm();
  }
}, { immediate: true });

// Lifecycle
onUnmounted(() => {
  if (previewIcon.value) {
    uploadService.revokePreviewUrl(previewIcon.value);
  }
});
</script>