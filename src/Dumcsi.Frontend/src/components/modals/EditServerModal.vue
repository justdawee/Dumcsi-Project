<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
        @click.self="closeModal"
    >
      <div
          class="w-full max-w-2xl transform rounded-2xl bg-bg-surface text-left align-middle shadow-xl transition-all border border-border-default/50"
      >
        <form @submit.prevent="handleUpdateServer">
          <!-- Fejléc -->
          <div class="p-6 border-b border-border-default">
            <h3 class="text-xl font-bold text-text-default">Server Settings</h3>
          </div>

          <!-- Törzs (görgethető tartalommal) -->
          <div
              class="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin"
          >
            <div class="flex flex-col lg:flex-row gap-6">
              <!-- Ikon feltöltés -->
              <div class="flex-shrink-0">
                <label
                    class="block text-sm font-medium text-text-secondary mb-2"
                >Server Icon</label
                >
                <div class="relative group w-32 h-32">
                  <div
                      class="relative rounded-full ring-4 ring-border-default/50"
                  >
                    <img
                        v-if="previewIcon || form.icon"
                        :src="previewIcon || form.icon"
                        alt="Server Icon"
                        class="w-32 h-32 rounded-full object-cover bg-main-700"
                    />
                    <div
                        v-else
                        class="w-32 h-32 rounded-full bg-main-700 flex items-center justify-center"
                    >
                      <ImageIcon class="w-10 h-10 text-text-muted" />
                    </div>
                  </div>
                  <label
                      class="absolute inset-0 bg-bg-base/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer"
                  >
                    <div class="text-center">
                      <Camera class="w-8 h-8 text-text-default mx-auto mb-1" />
                      <span class="text-xs text-text-default font-medium"
                      >Change Icon</span
                      >
                    </div>
                    <input
                        ref="iconFileInput"
                        accept="image/*"
                        class="hidden"
                        type="file"
                        @change="handleIconSelect"
                    />
                  </label>
                  <div
                      v-if="iconUploading"
                      class="absolute inset-0 bg-bg-base/80 rounded-full flex items-center justify-center"
                  >
                    <Loader2 class="w-8 h-8 animate-spin text-text-default" />
                  </div>
                </div>
                <div v-if="form.icon" class="mt-3 w-32">
                  <button
                      :disabled="removingIcon"
                      class="btn-secondary relative w-full text-xs py-1.5 text-danger hover:bg-danger/10 hover:text-red-300 border-danger/20 focus:outline-none rounded"
                      @click="removeIcon"
                  >
                    <span
                        v-if="removingIcon"
                        class="absolute left-3 top-1/2 transform -translate-y-1/2"
                    >
                      <Loader2 class="w-4 h-4 animate-spin" />
                    </span>
                    <span
                        v-else
                        class="absolute left-3 top-1/2 transform -translate-y-1/2"
                    >
                      <Trash2 class="w-4 h-4" />
                    </span>
                    <span class="block w-full text-center"> Remove </span>
                  </button>
                </div>
              </div>

              <!-- Szerver adatai -->
              <div class="flex-1 space-y-6">
                <div>
                  <label class="form-label" for="server-name"
                  >Server Name</label
                  >
                  <input
                      id="server-name"
                      v-model="form.name"
                      class="form-input"
                      required
                      type="text"
                  />
                </div>
                <div>
                  <label class="form-label" for="server-description"
                  >Description</label
                  >
                  <textarea
                      id="server-description"
                      v-model="form.description"
                      class="form-input min-h-[100px] resize-none"
                      maxlength="500"
                      placeholder="What's your server about?"
                      rows="4"
                  ></textarea>
                </div>
                <div class="flex items-center">
                  <input
                      id="public"
                      v-model="form.public"
                      class="w-4 h-4 text-primary bg-main-700 border-border-default rounded-sm focus:ring-primary/50"
                      type="checkbox"
                  />
                  <label class="ml-2 text-sm text-text-secondary" for="public">
                    Make server public
                  </label>
                </div>
              </div>
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
          </div>

          <!-- Lábléc -->
          <div
              class="flex items-center justify-between p-6 border-t border-border-default"
          >
            <button
                v-if="canDeleteServer"
                :disabled="deleting"
                class="btn-danger"
                type="button"
                @click="isDeleteModalOpen = true"
            >
              <Loader2 v-if="deleting" class="w-4 h-4 animate-spin mr-2" />
              Delete Server
            </button>
            <div v-else></div>
            <!-- Placeholder to keep alignment -->

            <div class="flex gap-3">
              <button class="btn-secondary" type="button" @click="closeModal">
                Cancel
              </button>
              <button
                  :disabled="!hasChanges || isLoading"
                  class="btn-primary"
                  type="submit"
              >
                <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </Transition>

  <!-- Törlés megerősítése modális ablak -->
  <ConfirmModal
      v-model="isDeleteModalOpen"
      :is-loading="deleting"
      confirm-text="Delete Server"
      intent="danger"
      message="Are you sure you want to delete this server? This action cannot be undone. All channels and messages will be permanently deleted."
      title="Delete Server"
      @confirm="handleDeleteServer"
  />
</template>

<script lang="ts" setup>
import {ref, reactive, watch, computed} from 'vue';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import serverService from '@/services/serverService';
import uploadService from '@/services/uploadService';
import type {ServerListItem, UpdateServerRequest} from '@/services/types';
import {Loader2, Camera, ImageIcon} from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import {getDisplayMessage} from '@/services/errorHandler';

// --- Props & Emits ---
const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
}>();

const emit = defineEmits(['close', 'server-updated', 'server-deleted']);

// --- State ---
const appStore = useAppStore();
const {addToast} = useToast();

const form = reactive({name: '', description: '', icon: '', public: false});
const originalForm = reactive({name: '', description: '', icon: '', public: false});

const isLoading = ref(false);
const error = ref('');

const deleting = ref(false);
const isDeleteModalOpen = ref(false);
const iconFileInput = ref<HTMLInputElement | null>(null);
const selectedIconFile = ref<File | null>(null);
const previewIcon = ref<string | null>(null);
const iconUploading = ref(false);
const removingIcon = ref(false);

// --- Computed ---
const hasChanges = computed(() => {
  return form.name !== originalForm.name ||
      form.description !== originalForm.description ||
      form.public !== originalForm.public ||
      form.icon !== originalForm.icon ||
      !!selectedIconFile.value;
});

const canDeleteServer = computed(() => props.server?.isOwner === true);

// --- Methods ---
const closeModal = () => {
  emit('close');
};

const resetForm = () => {
  if (props.server) {
    const serverData = {
      name: props.server.name,
      description: props.server.description || '',
      icon: props.server.icon || '',
      public: props.server.public,
    };
    Object.assign(form, serverData);
    Object.assign(originalForm, serverData);
  }

  if (previewIcon.value) {
    URL.revokeObjectURL(previewIcon.value);
  }
  previewIcon.value = null;
  selectedIconFile.value = null;
  if (iconFileInput.value) {
    iconFileInput.value.value = '';
  }
};

const handleIconSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    addToast({type: 'danger', message: 'Please select an image file.'});
    return;
  }
  if (file.size > 8 * 1024 * 1024) { // 8MB limit
    addToast({type: 'danger', message: 'Image size cannot exceed 8MB.'});
    return;
  }

  selectedIconFile.value = file;
  if (previewIcon.value) {
    URL.revokeObjectURL(previewIcon.value);
  }
  previewIcon.value = URL.createObjectURL(file);
};

const removeIcon = async () => {
  if (!props.server) return;
  removingIcon.value = true;
  try {
    await uploadService.deleteServerIcon(props.server.id);
    form.icon = '';
    addToast({type: 'success', message: 'Server icon removed.'});
    emit('server-updated');
  } catch (err: any) {
    addToast({type: 'danger', message: getDisplayMessage(err)});
  } finally {
    removingIcon.value = false;
  }
};

const handleUpdateServer = async () => {
  if (!props.server || !hasChanges.value) return;

  isLoading.value = true;
  iconUploading.value = !!selectedIconFile.value;
  error.value = '';

  try {
    let finalIconUrl = form.icon;

    if (selectedIconFile.value) {
      const response = await uploadService.uploadServerIcon(props.server.id, selectedIconFile.value);
      finalIconUrl = response.url;
    }

    const payload: UpdateServerRequest = {
      name: form.name,
      description: form.description || null,
      icon: finalIconUrl || null,
      public: form.public,
    };

    await serverService.updateServer(props.server.id, payload);
    addToast({type: 'success', message: 'Server settings updated.'});
    emit('server-updated');
    closeModal();
  } catch (err: any) {
    const displayMessage = getDisplayMessage(err);
    error.value = displayMessage;
    addToast({type: 'danger', message: displayMessage});
  } finally {
    isLoading.value = false;
    iconUploading.value = false;
  }
};

const handleDeleteServer = async () => {
  if (!props.server || !canDeleteServer.value) return;
  deleting.value = true;
  try {
    await appStore.deleteServer(props.server.id);
    addToast({type: 'success', message: `Server '${props.server.name}' has been deleted.`});
    emit('server-deleted');
    closeModal();
  } catch (err: any) {
    addToast({type: 'danger', message: getDisplayMessage(err)});
  } finally {
    deleting.value = false;
    isDeleteModalOpen.value = false;
  }
};

// --- Watcher ---
watch(() => props.modelValue, (isOpening) => {
  if (isOpening) {
    resetForm();
  }
}, {immediate: true});
</script>
