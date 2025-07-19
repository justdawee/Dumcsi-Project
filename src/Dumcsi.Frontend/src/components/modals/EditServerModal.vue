<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
        @click.self="closeModal"
    >
      <div
          class="w-full max-w-md transform rounded-2xl bg-gray-800 text-left align-middle shadow-xl transition-all border border-gray-700/50">
        <div class="p-6">
          <h3 class="text-xl font-bold text-white">Server Settings</h3>
          <p class="text-sm text-gray-400 mt-1">Update your server's name, description, and other settings.</p>
        </div>

        <form @submit.prevent="handleUpdateServer">
          <div class="p-6 space-y-4 border-y border-gray-700/50">
            <div>
              <label class="form-label" for="server-name">Server Name</label>
              <input id="server-name" v-model="form.name" class="form-input" required type="text"/>
            </div>
            <div>
              <label class="form-label" for="server-description">Description (Optional)</label>
              <textarea id="server-description" v-model="form.description" class="form-input resize-none"
                        rows="3"></textarea>
            </div>
            <div>
              <label class="form-label" for="server-icon-url">Icon URL (Optional)</label>
              <input id="server-icon-url" v-model="form.icon" class="form-input"
                     placeholder="https://example.com/icon.png"
                     type="text"/>
            </div>
            <div class="flex items-center">
              <input
                  id="public"
                  v-model="form.public"
                  class="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded-sm focus:ring-primary/50"
                  type="checkbox"
              />
              <label class="ml-2 text-sm text-gray-300" for="public">
                Make server public
              </label>
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
          </div>

          <div class="p-6 flex justify-end gap-3">
            <button class="btn-secondary" type="button" @click="closeModal">Cancel</button>
            <button :disabled="isLoading" class="btn-primary inline-flex items-center" type="submit">
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2"/>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {ref, reactive, watch} from 'vue';
import {Loader2} from 'lucide-vue-next';
import serverService from '@/services/serverService';
import {useToast} from '@/composables/useToast';
import type {ServerListItem, UpdateServerRequest} from '@/services/types';

const {addToast} = useToast();

// --- Props & Emits ---
const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
}>();

const emit = defineEmits(['close', 'server-updated']);

// --- State ---
const form = reactive<UpdateServerRequest>({
  name: '',
  description: '',
  icon: '',
  public: false
});
const isLoading = ref(false);
const error = ref('');

// --- Logic ---
const closeModal = () => {
  emit('close');
};

watch(() => props.server, (newServer) => {
  if (newServer) {
    form.name = newServer.name;
    form.description = newServer.description || '';
    form.icon = newServer.icon || '';
    form.public = newServer.public;
  }
}, {immediate: true});

const handleUpdateServer = async () => {
  if (!props.server) return;
  isLoading.value = true;

  const payload: UpdateServerRequest = {
    name: form.name,
    description: form.description,
    icon: form.icon || null,
    public: form.public,
  };

  try {
    await serverService.updateServer(props.server.id, payload);
    addToast({
      type: 'success',
      message: 'Successfully updated server settings.',
    });
    emit('server-updated');
    closeModal();
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: 'Failed to update server settings.',
    })
  } finally {
    isLoading.value = false;
  }
};
</script>
