<template>
  <div class="group hover:bg-main-700/20 px-4 py-1 rounded-md flex items-start gap-3">
    <UserAvatar :user-id="message.senderId" :username="message.sender.username" :avatar-url="message.sender.avatar" :size="40" class="mt-1" />
    <div>
      <div class="flex items-baseline gap-2">
        <span class="font-semibold text-text-default">{{ message.sender.username }}</span>
        <span class="text-xs text-text-tertiary">{{ formatTime(message.timestamp) }}</span>
        <span v-if="message.editedTimestamp" class="text-xs text-text-tertiary">{{ t('chat.item.edited') }}</span>
      </div>
      <p class="text-text-default whitespace-pre-wrap">{{ message.content }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTime } from '@/utils/helpers';
import { useI18n } from 'vue-i18n';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type { DmMessageDto } from '@/services/types';

defineProps<{ message: DmMessageDto }>();
const { t } = useI18n();
</script>
