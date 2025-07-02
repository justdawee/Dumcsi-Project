<template>
  <Transition name="modal-fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md transform rounded-2xl bg-gray-800 text-left align-middle shadow-xl transition-all border border-gray-700/50">
        <div class="p-6">
          <h3 class="text-xl font-bold text-white">Server Settings</h3>
          <p class="text-sm text-gray-400 mt-1">Update your server's name, description, and other settings.</p>
        </div>

        <form @submit.prevent="handleUpdateServer">
          <div class="p-6 space-y-4 border-y border-gray-700/50">
            <div>
              <label for="server-name" class="form-label">Server Name</label>
              <input v-model="form.name" type="text" id="server-name" class="form-input" required />
            </div>
            <div>
              <label for="server-description" class="form-label">Description (Optional)</label>
              <textarea v-model="form.description" id="server-description" rows="3" class="form-input resize-none"></textarea>
            </div>
            <!-- Ikon URL mező -->
            <div>
              <label for="server-icon-url" class="form-label">Icon URL (Optional)</label>
              <input v-model="form.iconUrl" type="text" id="server-icon-url" class="form-input" placeholder="https://example.com/icon.png" />
            </div>
            <!-- Public státusz checkbox -->
            <div class="flex items-center">
              <input
                id="isPublic"
                v-model="form.isPublic"
                type="checkbox"
                class="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded-sm focus:ring-primary/50"
              />
              <label for="isPublic" class="ml-2 text-sm text-gray-300">
                Make server public
              </label>
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
          </div>

          <div class="p-6 flex justify-end gap-3">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" :disabled="isLoading" class="btn-primary inline-flex items-center">
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import serverService from '@/services/serverService';
import type { ServerListItem, UpdateServerPayload } from '@/services/types';

// --- Props & Emits ---
const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
}>();

const emit = defineEmits(['close', 'server-updated']);

// --- State ---
const form = reactive<UpdateServerPayload>({
  name: '',
  description: '',
  iconUrl: '',
  isPublic: false
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
    form.iconUrl = newServer.iconUrl || '';
    form.isPublic = newServer.isPublic;
  }
}, { immediate: true });

const handleUpdateServer = async () => {
  if (!props.server) return;
  isLoading.value = true;
  error.value = '';
  try {
    await serverService.updateServer(props.server.id, form);
    emit('server-updated');
    closeModal();
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to update server.';
  } finally {
    isLoading.value = false;
  }
};
</script>
