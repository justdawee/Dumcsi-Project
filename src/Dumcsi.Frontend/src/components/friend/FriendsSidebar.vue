<template>
  <SidebarContainer>
    <template #header>
      <button
          @click="router.push('/servers')"
          class="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-main-700 transition-colors text-text-muted hover:text-text-default"
      >
        <Server class="w-4 h-4" />
        <span class="text-sm font-medium">Servers</span>
      </button>
      <button
          class="flex items-center gap-2 px-3 py-1.5 rounded bg-main-700 text-text-default"
      >
        <Users class="w-4 h-4" />
        <span class="text-sm font-medium">Friends</span>
      </button>
    </template>

    <template #content>
      <div class="p-2">
        <div class="flex items-center justify-between px-2 py-1 mb-2">
          <span class="text-xs font-semibold text-text-tertiary uppercase">Direct Messages</span>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center py-4">
          <Loader2 class="w-5 h-5 text-text-muted animate-spin" />
        </div>

        <!-- DM List -->
        <div v-else class="space-y-0.5">
          <div v-if="conversations.length === 0" class="text-center py-8">
            <p class="text-sm text-text-tertiary">No direct messages yet</p>
          </div>

          <RouterLink
              v-for="conv in conversations"
              :key="conv.userId"
              :to="`/dm/${conv.userId}`"
              class="dm-item group"
              :class="{ 'active': currentDmUserId === conv.userId }"
          >
            <UserAvatar
                :user-id="conv.userId"
                :username="conv.username"
                :size="32"
                class="flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span
                    class="truncate"
                    :class="[
                    'text-sm',
                    hasUnread(conv.userId) ? 'font-semibold text-text-default' : 'font-medium text-text-secondary'
                  ]"
                >
                  {{ conv.username }}
                </span>
                <button
                    @click.prevent.stop="closeConversation(conv.userId)"
                    class="opacity-0 group-hover:opacity-100 transition"
                    title="Close DM"
                >
                  <X class="w-4 h-4 text-text-muted hover:text-text-default" />
                </button>
              </div>
              <p
                  v-if="conv.lastMessage"
                  class="text-xs truncate"
                  :class="hasUnread(conv.userId) ? 'text-text-secondary' : 'text-text-tertiary'"
              >
                {{ conv.lastMessage }}
              </p>
            </div>
          </RouterLink>
        </div>
      </div>
    </template>
  </SidebarContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDmStore } from '@/stores/dm';
import {Server, Users, Loader2, X} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import SidebarContainer from '@/components/common/SidebarContainer.vue';
import type { EntityId } from '@/services/types';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const dmStore = useDmStore();

const loading = ref(true);

const currentDmUserId = computed(() =>
    route.name === 'DirectMessage' ? parseInt(route.params.userId as string) : null
);

const conversations = computed(() => dmStore.conversations);

const hasUnread = (userId: EntityId) => dmStore.unreadMessages.has(userId);

const closeConversation = async (userId: EntityId) => {
  if (currentDmUserId.value === userId) {
    router.push('/friends');
  }
  // Optionally remove from local state
  dmStore.removeConversation(userId);
};

// Fetch conversations on mount
onMounted(async () => {
  loading.value = true;
  try {
    await dmStore.fetchConversations();
  } finally {
    loading.value = false;
  }
});

// Refresh conversations when route changes
watch(() => route.params.userId, async (newUserId) => {
  if (newUserId) {
    await dmStore.fetchConversations();
  }
});
</script>

<style scoped>
@reference "@/style.css";

.dm-item {
  @apply flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
  hover:bg-main-700 transition-colors;
}

.dm-item.active {
  @apply bg-main-600;
}
</style>