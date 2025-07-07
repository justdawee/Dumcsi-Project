<template>
  <BaseModal
    title="Create Channel"
    size="md"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Channel Type -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Channel Type
        </label>
        <div class="space-y-2">
          <label class="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition">
            <input
              v-model="form.type"
              type="radio"
              :value="ChannelType.Text"
              class="w-4 h-4 text-primary"
            />
            <div class="ml-3 flex items-center gap-2">
              <Hash class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium text-white">Text Channel</p>
                <p class="text-xs text-gray-400">Send messages, images, GIFs, and more</p>
              </div>
            </div>
          </label>
          
          <label class="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition">
            <input
              v-model="form.type"
              type="radio"
              :value="ChannelType.Voice"
              class="w-4 h-4 text-primary"
            />
            <div class="ml-3 flex items-center gap-2">
              <Volume2 class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium text-white">Voice Channel</p>
                <p class="text-xs text-gray-400">Hang out together with voice and video</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- Channel Name -->
      <div>
        <label for="channelName" class="block text-sm font-medium text-gray-300 mb-1">
          Channel Name
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Hash v-if="form.type === ChannelType.Text" class="w-4 h-4 text-gray-500" />
            <Volume2 v-else class="w-4 h-4 text-gray-500" />
          </div>
          <input
            id="channelName"
            v-model="form.name"
            type="text"
            required
            maxlength="100"
            placeholder="new-channel"
            class="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            @input="formatChannelName"
          />
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Channel names must be lowercase without spaces
        </p>
      </div>

      <!-- Channel Description (Optional) -->
      <div>
        <label for="channelDescription" class="block text-sm font-medium text-gray-300 mb-1">
          Description <span class="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="channelDescription"
          v-model="form.description"
          rows="3"
          maxlength="1024"
          placeholder="What's this channel about?"
          class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
        <p class="text-xs text-gray-500 mt-1">
          {{ form.description.length }}/1024
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-3 pt-2">
        <button
          type="button"
          @click="handleClose"
          class="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!isValid || isSubmitting"
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>{{ isSubmitting ? 'Creating...' : 'Create Channel' }}</span>
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import { Hash, Volume2, Loader2 } from 'lucide-vue-next';
import BaseModal from '@/components/ui/BaseModal.vue';
import { ChannelType } from '@/services/types';
import type { CreateChannelPayload, ChannelDetail } from '@/services/types';

// Props & Emits
const props = defineProps<{
  serverId: number;
}>();

const emit = defineEmits<{
  close: [];
  channelCreated: [channel: ChannelDetail];
}>();

// Composables
const appStore = useAppStore();
const { addToast } = useToast();

// State
const isSubmitting = ref(false);
const form = ref({
  name: '',
  type: ChannelType.Text,
  description: ''
});

// Computed
const isValid = computed(() => {
  return form.value.name.trim().length > 0 && 
         form.value.name.length <= 100 &&
         /^[a-z0-9-]+$/.test(form.value.name);
});

// Methods
const formatChannelName = () => {
  // Convert to lowercase and replace spaces with hyphens
  form.value.name = form.value.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const handleSubmit = async () => {
  if (!isValid.value) return;
  
  isSubmitting.value = true;
  try {
    const payload: CreateChannelPayload = {
      name: form.value.name,
      type: form.value.type,
      description: form.value.description || undefined
    };
    
    const channel = await appStore.createChannel(props.serverId, payload);
    
    addToast({
      type: 'success',
      message: `Channel #${channel.name} created successfully`,
      duration: 3000
    });
    
    emit('channelCreated', channel);
    handleClose();
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to create channel',
      duration: 5000
    });
  } finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  form.value = {
    name: '',
    type: ChannelType.Text,
    description: ''
  };
  emit('close');
};

// Watch for channel type changes
watch(() => form.value.type, (newType) => {
  // Suggest default names based on type
  if (!form.value.name) {
    form.value.name = newType === ChannelType.Text ? 'general' : 'voice-chat';
  }
});
</script>