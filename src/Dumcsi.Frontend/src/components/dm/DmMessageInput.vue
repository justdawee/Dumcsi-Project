<template>
  <form class="p-2" @submit.prevent="handleSend">
    <textarea v-model="content" class="form-input w-full resize-none" rows="3" :placeholder="t('dm.input.message')"></textarea>
    <div class="flex justify-end mt-2">
      <button type="submit" class="btn-primary" :disabled="sending">{{ t('dm.input.send') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CreateMessageRequest } from '@/services/types';

const emit = defineEmits<{ (e: 'send', payload: CreateMessageRequest): void }>();
const content = ref('');
const sending = ref(false);
const { t } = useI18n();

const handleSend = async () => {
  if (!content.value.trim()) return;
  sending.value = true;
  try {
    emit('send', { content: content.value });
    content.value = '';
  } finally {
    sending.value = false;
  }
};
</script>
