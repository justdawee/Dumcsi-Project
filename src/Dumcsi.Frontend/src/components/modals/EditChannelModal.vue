<template>
  <!-- Fő modal ablak konténer -->
  <Transition name="modal-fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md transform rounded-2xl bg-gray-800 text-left align-middle shadow-xl transition-all border border-gray-700/50">
        <!-- Fejléc -->
        <div class="p-6">
          <h3 class="text-xl font-bold text-white">Edit Channel</h3>
          <p class="text-sm text-gray-400 mt-1">Update your channel's settings or delete it.</p>
        </div>

        <!-- Szerkesztő űrlap -->
        <form @submit.prevent="handleUpdateChannel">
          <div class="p-6 space-y-4 border-y border-gray-700/50">
            <div>
              <label for="channel-name" class="form-label">Channel Name</label>
              <input v-model="form.name" type="text" id="channel-name" class="form-input" required />
            </div>
            <div>
              <label for="channel-description" class="form-label">Description (Optional)</label>
              <textarea v-model="form.description" id="channel-description" rows="3" class="form-input resize-none"></textarea>
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
          </div>

          <!-- Műveleti gombok -->
          <div class="p-6 flex justify-end gap-3">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" :disabled="isLoading" class="btn-primary inline-flex items-center">
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2" />
              Save Changes
            </button>
          </div>
        </form>

        <!-- Danger Zone a törléshez -->
        <div class="p-6 border-t border-gray-700/50 bg-gray-900/40 rounded-b-2xl">
           <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-red-400">Delete Channel</p>
                <p class="text-sm text-gray-400">This action cannot be undone.</p>
              </div>
              <button @click="isConfirmDeleteOpen = true" class="btn-danger flex-shrink-0">
                Delete
              </button>
            </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Megerősítő modális ablak a törléshez -->
  <ConfirmModal
    v-model="isConfirmDeleteOpen"
    title="Delete Channel"
    :message="`Are you sure you want to delete the channel #${channel?.name}? This is permanent.`"
    confirm-text="Delete Channel"
    :is-loading="isDeleting"
    @confirm="handleDeleteChannel"
    intent="danger"
  />
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import channelService from '@/services/channelService';
import type { ChannelListItem, UpdateChannelPayload } from '@/services/types';

// --- Props & Emits ---
const props = defineProps<{
  modelValue: boolean;
  channel: ChannelListItem | null;
}>();

const emit = defineEmits(['close', 'channel-updated', 'channel-deleted']);

// --- State ---
const form = reactive<UpdateChannelPayload>({ name: '', description: '' });
const isLoading = ref(false);
const isDeleting = ref(false);
const error = ref('');
const isConfirmDeleteOpen = ref(false);

// --- Logic ---
const closeModal = () => {
  emit('close');
};

// Űrlap feltöltése, amikor a prop megváltozik
watch(() => props.channel, (newChannel) => {
  if (newChannel) {
    form.name = newChannel.name;
    form.description = newChannel.description || '';
  }
}, { immediate: true });

// Csatorna adatainak frissítése
const handleUpdateChannel = async () => {
  if (!props.channel) return;
  isLoading.value = true;
  error.value = '';
  try {
    // A backend a `position`-t is várja, de a leírás alapján azt most nem módosítjuk.
    await channelService.updateChannel(props.channel.id, {
      name: form.name,
      description: form.description,
      // position: props.channel.position // Ha a pozíciót is kezelni kellene
    });
    emit('channel-updated');
    closeModal();
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to update channel.';
  } finally {
    isLoading.value = false;
  }
};

// Csatorna törlése
const handleDeleteChannel = async () => {
  if (!props.channel) return;
  isDeleting.value = true;
  error.value = '';
  try {
    await channelService.deleteChannel(props.channel.id);
    emit('channel-deleted');
    isConfirmDeleteOpen.value = false;
    closeModal();
  } catch (err: any) {
    console.error('Failed to delete channel:', err);
    // Hiba esetén a megerősítő ablakot bezárjuk, és a fő ablakban jelezzük a hibát.
    isConfirmDeleteOpen.value = false;
    error.value = err.response?.data?.message || 'Failed to delete channel.';
  } finally {
    isDeleting.value = false;
  }
};
</script>