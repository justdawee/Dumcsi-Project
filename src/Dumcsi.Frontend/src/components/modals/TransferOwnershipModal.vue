<template>
  <BaseModal
      :model-value="modelValue"
      title="Transfer Ownership"
      @close="close"
      @update:modelValue="val => emit('update:modelValue', val)"
  >
    <template #default>
      <div class="space-y-4">
        <p class="text-sm text-text-secondary">
          Select a member to transfer ownership of <strong>{{ server?.name }}</strong>.
        </p>
        <div v-if="loadingMembers" class="flex justify-center py-4">
          <Loader2 class="w-5 h-5 animate-spin" />
        </div>
        <select
            v-else
            v-model.number="selectedUserId"
            class="form-input w-full"
        >
          <option :value="null" disabled>Select member</option>
          <option
              v-for="m in members"
              :key="m.userId"
              :value="m.userId"
          >
            {{ m.username }}
          </option>
        </select>
        <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <button class="btn-secondary" type="button" @click="close">Cancel</button>
        <button
            :disabled="!selectedUserId || loading"
            class="btn-warning"
            type="button"
            @click="handleTransfer"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin mr-2" />
          Transfer
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue';
import {useAuthStore} from '@/stores/auth';
import BaseModal from './BaseModal.vue';
import {Loader2} from 'lucide-vue-next';
import serverService from '@/services/serverService';
import {useToast} from '@/composables/useToast';
import type {ServerListItem, ServerMember} from '@/services/types';
import {getDisplayMessage} from '@/services/errorHandler';

const props = defineProps<{ modelValue: boolean; server: ServerListItem | null }>();
const emit = defineEmits(['update:modelValue', 'transferred']);
const {addToast} = useToast();
const authStore = useAuthStore();

const members = ref<ServerMember[]>([]);
const loadingMembers = ref(false);
const selectedUserId = ref<number | null>(null);
const loading = ref(false);
const error = ref('');

const close = () => {
  emit('update:modelValue', false);
};

watch(() => props.modelValue, async (open) => {
  if (open && props.server) {
    selectedUserId.value = null;
    error.value = '';
    loadingMembers.value = true;
    try {
      members.value = await serverService.getServerMembers(props.server.id);
      const currentUserId = authStore.user?.id;
      if (currentUserId) {
        members.value = members.value.filter(m => m.userId !== currentUserId);
      }
    } catch (err: any) {
      error.value = getDisplayMessage(err);
    } finally {
      loadingMembers.value = false;
    }
  }
});

const handleTransfer = async () => {
  if (!props.server || !selectedUserId.value) return;
  loading.value = true;
  error.value = '';
  try {
    await serverService.transferOwnership(props.server.id, { newOwnerId: selectedUserId.value });
    addToast({ type: 'success', message: 'Ownership transferred.' });
    emit('transferred');
    close();
  } catch (err: any) {
    error.value = getDisplayMessage(err);
  } finally {
    loading.value = false;
  }
};
</script>