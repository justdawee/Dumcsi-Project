<template>
  <div v-if="typingUsers.length > 0" class="px-4 py-2 text-sm text-gray-400">
    <span v-if="typingUsers.length === 1">
      {{ getDisplayName(typingUsers[0]) }} is typing...
    </span>
    <span v-else-if="typingUsers.length === 2">
      {{ getDisplayName(typingUsers[0]) }} and {{ getDisplayName(typingUsers[1]) }} are typing...
    </span>
    <span v-else>
      {{ getDisplayName(typingUsers[0]) }} and {{ typingUsers.length - 1 }} others are typing...
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useUserDisplay } from '@/composables/useUserDisplay';
import type { ChannelDetail } from '@/services/types';

const props = defineProps<{
  channel: ChannelDetail;
}>();

const appStore = useAppStore();
const { getDisplayName } = useUserDisplay();

const typingUserIds = computed(() => 
  appStore.getTypingUsersInChannel(props.channel.id)
);

const typingUsers = computed(() => 
  typingUserIds.value
    .map(userId => appStore.members.find(m => m.userId === userId))
    .filter(Boolean)
);
</script>