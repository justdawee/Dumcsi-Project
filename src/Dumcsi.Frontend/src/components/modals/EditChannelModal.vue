<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
        v-backdrop-close="closeModal"
    >
      <div
          class="w-full max-w-md transform rounded-2xl bg-bg-surface text-left align-middle shadow-xl transition-all border border-border-default/50">
        <!-- Fejléc -->
        <div class="p-6">
          <h3 class="text-xl font-bold text-text-default">Edit Channel</h3>
          <p class="text-sm text-text-muted mt-1">Update your channel's settings or delete it.</p>
        </div>

        <!-- Szerkesztő űrlap -->
        <form @submit.prevent="handleUpdateChannel">
          <div class="p-6 space-y-4 border-y border-border-default">
            <div>
              <label class="form-label" for="channel-name">Channel Name</label>
              <input id="channel-name" v-model="form.name" class="form-input" required type="text"/>
            </div>
            <div>
              <label class="form-label" for="channel-description">Description (Optional)</label>
              <textarea id="channel-description" v-model="form.description" class="form-input resize-none"
                        rows="3"></textarea>
            </div>
            <div>
              <label class="form-label" for="channel-topic">Topic</label>
              <select id="channel-topic" v-model="form.topicId" class="form-input">
                <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            
            <p v-if="error" class="form-error">{{ error }}</p>
          </div>

          <!-- Műveleti gombok -->
          <div class="p-6 flex justify-end gap-3">
            <button class="btn-secondary" type="button" @click="closeModal">Cancel</button>
            <button :disabled="isLoading" class="btn-primary inline-flex items-center" type="submit">
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mr-2"/>
              Save Changes
            </button>
          </div>
        </form>

        <!-- Danger Zone a törléshez -->
        <div class="p-6 border-t border-border-default bg-bg-base/40 rounded-b-2xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-danger">Delete Channel</p>
              <p class="text-sm text-text-muted">This action cannot be undone.</p>
            </div>
            <button class="btn-danger flex-shrink-0" @click="isConfirmDeleteOpen = true">
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
      :is-loading="isDeleting"
      :message="`Are you sure you want to delete the channel #${channel?.name}? This is permanent.`"
      confirm-text="Delete Channel"
      intent="danger"
      title="Delete Channel"
      @confirm="handleDeleteChannel"
  />
</template>

<script lang="ts" setup>
import {ref, reactive, watch, computed} from 'vue';
import {Loader2} from 'lucide-vue-next';
import ConfirmModal from './ConfirmModal.vue';
import channelService from '@/services/channelService';
import {useToast} from '@/composables/useToast';
import {useAppStore} from '@/stores/app';
import type {ChannelDetailDto, UpdateChannelRequest} from '@/services/types';
const {addToast} = useToast();

// --- Props & Emits ---
const props = defineProps<{
  modelValue: boolean;
  channel: ChannelDetailDto | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'channel-updated', updatedChannelData: { id: number, name: string, description?: string }): void;
  (e: 'channel-deleted', channelId: number): void;
}>();

// --- State ---
const form = reactive<Partial<UpdateChannelRequest>>({name: '', description: '', topicId: null});
const isLoading = ref(false);
const isDeleting = ref(false);
const error = ref('');
const isConfirmDeleteOpen = ref(false);
const appStore = useAppStore();
const topics = computed(() => appStore.currentServer?.topics || []);

// --- Logic ---
const closeModal = () => {
  emit('close');
};

watch(() => props.channel, (newChannel) => {
  if (newChannel) {
    form.name = newChannel.name;
    form.description = newChannel.description || '';
    form.topicId = newChannel.topicId ?? null;
  }
}, {immediate: true});

const handleUpdateChannel = async () => {
  if (!props.channel) return;
  isLoading.value = true;
  try {
    await channelService.updateChannel(props.channel.id, {
      name: form.name,
      description: form.description,
      position: props.channel.position,
      topicId: form.topicId,
    });
    emit('channel-updated', {
      id: props.channel.id,
      name: form.name || '',
      description: form.description || undefined,
    });
    
    addToast({
      type: 'success',
      message: 'Channel updated successfully.',
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
  try {
    await channelService.deleteChannel(props.channel.id);
    emit('channel-deleted', props.channel.id);
    
    addToast({
      type: 'success',
      message: 'Channel deleted successfully.',
    });
    
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
