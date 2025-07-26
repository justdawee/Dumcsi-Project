<template>
  <BaseModal :model-value="modelValue" title="Add Friend" @close="close" @update:modelValue="val => emit('update:modelValue', val)">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="form-label">Username</label>
        <input v-model="username" class="form-input" placeholder="Username" required type="text" />
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="close">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin inline mr-2" />
          Send Request
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseModal from '@/components/modals/BaseModal.vue';
import { useFriendStore } from '@/stores/friends';
import { Loader2 } from 'lucide-vue-next';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
const store = useFriendStore();

const username = ref('');
const loading = ref(false);

const close = () => emit('update:modelValue', false);

const submit = async () => {
  if (!username.value) return;
  loading.value = true;
  try {
    await store.sendRequest(username.value);
    username.value = '';
    close();
  } finally {
    loading.value = false;
  }
};
</script>