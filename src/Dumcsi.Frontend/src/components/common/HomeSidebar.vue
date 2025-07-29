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
        <span class="text-sm font-medium">Home</span>
      </button>
    </template>

    <template #content>
      <div class="p-2">
        <!-- Friends Section -->
        <div class="mb-4">
          <div class="flex items-center justify-between px-2 py-1 mb-2">
            <span class="text-xs font-semibold text-text-tertiary uppercase">Friends</span>
            <button
                @click="showAddFriend = true"
                class="p-1 hover:bg-main-700 rounded transition"
                title="Add Friend"
            >
              <UserPlus class="w-4 h-4 text-text-muted hover:text-text-default" />
            </button>
          </div>

          <!-- Loading state -->
          <div v-if="friendsLoading" class="flex items-center justify-center py-4">
            <Loader2 class="w-5 h-5 text-text-muted animate-spin" />
          </div>

          <!-- Online Friends List -->
          <div v-else class="space-y-0.5 mb-2">
            <div v-if="onlineFriends.length === 0 && !friendsLoading" class="text-center py-2">
              <p class="text-xs text-text-tertiary">No friends online</p>
            </div>
            
            <div
                v-for="friend in onlineFriends.slice(0, 5)"
                :key="friend.userId"
                class="friend-item group"
                @click="startDirectMessage(friend.userId)"
            >
              <UserAvatar
                  :user-id="friend.userId"
                  :username="friend.username"
                  :size="24"
                  class="flex-shrink-0"
                  show-online-indicator
              />
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-text-default truncate block">
                  {{ friend.username }}
                </span>
              </div>
              <button
                  @click.stop="router.push('/friends')"
                  class="opacity-0 group-hover:opacity-100 transition"
                  title="View All Friends"
              >
                <ExternalLink class="w-4 h-4 text-text-muted hover:text-text-default" />
              </button>
            </div>

            <!-- Show more friends link -->
            <div v-if="onlineFriends.length > 5" class="px-2 py-1">
              <button
                  @click="router.push('/friends')"
                  class="text-xs text-text-muted hover:text-text-secondary"
              >
                +{{ onlineFriends.length - 5 }} more friends online
              </button>
            </div>
          </div>

          <!-- View All Friends Button -->
          <div class="px-2">
            <button
                @click="router.push('/friends')"
                class="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1"
            >
              <Users class="w-3 h-3" />
              View All Friends
            </button>
          </div>
        </div>

        <!-- Direct Messages Section -->
        <div>
          <div class="flex items-center justify-between px-2 py-1 mb-2">
            <span class="text-xs font-semibold text-text-tertiary uppercase">Direct Messages</span>
          </div>

          <!-- Loading state -->
          <div v-if="dmLoading" class="flex items-center justify-center py-4">
            <Loader2 class="w-5 h-5 text-text-muted animate-spin" />
          </div>

          <!-- DM List -->
          <div v-else class="space-y-0.5">
            <div v-if="conversations.length === 0" class="text-center py-4">
              <p class="text-xs text-text-tertiary">No direct messages yet</p>
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
                  :size="24"
                  class="flex-shrink-0"
                  show-online-indicator
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
      </div>
    </template>
  </SidebarContainer>

  <!-- Add Friend Modal -->
  <AddFriendModal v-model="showAddFriend" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDmStore } from '@/stores/dm';
import { useFriendStore } from '@/stores/friends';
import { Server, Users, Loader2, X, UserPlus, ExternalLink } from 'lucide-vue-next';
import SidebarContainer from '@/components/common/SidebarContainer.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import AddFriendModal from '@/components/friend/AddFriendModal.vue';
import type { EntityId } from '@/services/types';

const route = useRoute();
const router = useRouter();
const dmStore = useDmStore();
const friendStore = useFriendStore();

const dmLoading = ref(true);
const friendsLoading = ref(true);
const showAddFriend = ref(false);

const currentDmUserId = computed(() =>
    route.name === 'DirectMessage' ? parseInt(route.params.userId as string) : null
);

const conversations = computed(() => dmStore.conversations);

const onlineFriends = computed(() =>
    friendStore.friendsWithStatus.filter(f => f.online)
);

const hasUnread = (userId: EntityId) => dmStore.unreadMessages.has(userId);

const startDirectMessage = (userId: EntityId) => {
  router.push(`/dm/${userId}`);
};

const closeConversation = async (userId: EntityId) => {
  if (currentDmUserId.value === userId) {
    router.push('/friends');
  }
  dmStore.removeConversation(userId);
};

// Fetch data on mount
onMounted(async () => {
  // Fetch DM conversations
  dmLoading.value = true;
  try {
    await dmStore.fetchConversations();
  } finally {
    dmLoading.value = false;
  }

  // Fetch friends data
  friendsLoading.value = true;
  try {
    await Promise.all([
      friendStore.fetchFriends(),
      friendStore.fetchRequests(),
      friendStore.fetchDmSettings()
    ]);
  } finally {
    friendsLoading.value = false;
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

.friend-item {
  @apply flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
  hover:bg-main-700 transition-colors;
}
</style>