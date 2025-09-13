<template>
  <BaseModal :model-value="modelValue" :title="t('friends.add.title')" @close="close" @update:modelValue="val => emit('update:modelValue', val)">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="form-label">{{ t('friends.add.username') }}</label>
        <input v-model="username" class="form-input" :placeholder="t('friends.add.usernamePlaceholder')" required type="text" />
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="close">{{ t('friends.add.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin inline mr-2" />
          {{ t('friends.add.send') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/modals/BaseModal.vue';
import { useFriendStore } from '@/stores/friends';
import { Loader2 } from 'lucide-vue-next';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
const store = useFriendStore();

const username = ref('');
const loading = ref(false);
const { t } = useI18n();

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
