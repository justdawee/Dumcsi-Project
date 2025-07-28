<template>
  <div class="flex items-center px-4 py-3 hover:bg-main-800 rounded-lg transition-colors">
    <UserAvatar
        :user-id="request.fromUserId"
        :username="request.fromUsername"
        :size="40"
    />

    <div class="flex-1 ml-3">
      <div class="flex items-center">
        <span class="font-medium text-text-default">{{ request.fromUsername }}</span>
        <span class="ml-2 text-xs text-text-tertiary">
          sent you a friend request
        </span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
          @click="$emit('accept', request.requestId)"
          class="p-2 rounded-full hover:bg-success/20 transition-colors"
          title="Accept"
      >
        <Check class="w-5 h-5 text-success" />
      </button>

      <button
          @click="$emit('decline', request.requestId)"
          class="p-2 rounded-full hover:bg-danger/20 transition-colors"
          title="Decline"
      >
        <X class="w-5 h-5 text-danger" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, X } from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type { FriendRequestItem } from '@/services/types';

defineProps<{
  request: FriendRequestItem;
}>();

defineEmits<{
  (e: 'accept', requestId: number): void;
  (e: 'decline', requestId: number): void;
}>();
</script>