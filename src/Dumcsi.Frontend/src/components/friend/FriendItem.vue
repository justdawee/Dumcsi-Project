<template>
  <div class="flex items-center px-4 py-2 hover:bg-main-800 rounded-lg transition-colors group">
    <UserAvatar
        :user-id="friend.userId"
        :username="friend.username"
        :size="40"
        :show-online-indicator="true"
    />

    <div class="flex-1 ml-3">
      <div class="flex items-center">
        <span class="font-medium text-text-default">{{ friend.username }}</span>
        <span
            v-if="friend.online"
            class="ml-2 text-xs text-accent"
        >
          Online
        </span>
        <span
            v-else
            class="ml-2 text-xs text-text-tertiary"
        >
          Offline
        </span>
      </div>
    </div>

    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
          @click="$emit('message', friend.userId)"
          class="p-2 rounded-full hover:bg-main-700 transition-colors"
          title="Send Message"
      >
        <MessageCircle class="w-5 h-5 text-text-muted" />
      </button>

      <button
          @click="openContextMenu"
          ref="menuButton"
          class="p-2 rounded-full hover:bg-main-700 transition-colors"
          title="More Options"
      >
        <MoreVertical class="w-5 h-5 text-text-muted" />
      </button>
    </div>

    <ContextMenu
        ref="contextMenu"
        :items="menuItems"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { MessageCircle, MoreVertical, UserX } from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ContextMenu from '@/components/ui/ContextMenu.vue';
import type { FriendListItem } from '@/services/types';

const props = defineProps<{
  friend: FriendListItem & { online?: boolean };
}>();

const emit = defineEmits<{
  (e: 'message', userId: number): void;
  (e: 'remove', userId: number): void;
}>();

const contextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const menuButton = ref<HTMLElement | null>(null);

const menuItems = computed(() => [
  {
    label: 'Remove Friend',
    icon: UserX,
    action: () => emit('remove', props.friend.userId),
    danger: true
  }
]);

const openContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  if (contextMenu.value && menuButton.value) {
    contextMenu.value.open(event);
  }
};
</script>