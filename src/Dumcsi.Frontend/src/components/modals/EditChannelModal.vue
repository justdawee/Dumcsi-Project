<template>
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
import { useToast } from '@/composables/useToast';
import type { ChannelListItem, UpdateChannelPayload } from '@/services/types';

const { addToast } = useToast();

// --- Props & Emits ---
const props = defineProps<{
  modelValue: boolean;
  channel: ChannelListItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'channel-updated', updatedChannelData: { id: number, name: string, description?: string }): void;
  (e: 'channel-deleted', channelId: number): void;
}>();

// --- State ---
const form = reactive<Partial<UpdateChannelPayload>>({ name: '', description: '' });
const isLoading = ref(false);
const isDeleting = ref(false);
const error = ref('');
const isConfirmDeleteOpen = ref(false);

// --- Logic ---
const closeModal = () => {
  emit('close');
};

watch(() => props.channel, (newChannel) => {
  if (newChannel) {
    form.name = newChannel.name;
    form.description = newChannel.description || '';
  }
}, { immediate: true });

const handleUpdateChannel = async () => {
  if (!props.channel) return;
  isLoading.value = true;
  addToast({
      type: 'success',
      message: 'Channel updated successfully.',
    });
  try {
    await channelService.updateChannel(props.channel.id, {
      name: form.name,
      description: form.description,
      position: props.channel.position,
    });
    emit('channel-updated', {
      id: props.channel.id,
      name: form.name,
      description: form.description,
    });
    closeModal();
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: 'Failed to update channel.',
    });
  } finally {
    isLoading.value = false;
  }
};

const handleDeleteChannel = async () => {
  if (!props.channel) return;
  isDeleting.value = true;
  addToast({
      type: 'success',
      message: 'Channel deleted successfully.',
    });
  try {
    await channelService.deleteChannel(props.channel.id);
    emit('channel-deleted', props.channel.id);
    isConfirmDeleteOpen.value = false;
    closeModal();
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: 'Failed to delete channel.',
    });
    isConfirmDeleteOpen.value = false;
  } finally {
    isDeleting.value = false;
  }
};
</script>