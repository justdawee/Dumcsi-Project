<template>
  <SidebarContainer>
    <template #header>
      <div class="px-2 w-full">
        <button
            class="w-full px-1.5 py-2 text-sm font-normal text-gray-400 bg-main-900 hover:bg-main-800 rounded-md transition-colors text-center border border-main-700"
            @click="showSearchModal = true"
        >
          Find or start a conversation
        </button>
      </div>
    </template>

    <template #content>
      <div class="p-2">

        <!-- Navigation Buttons -->
        <div class="flex flex-col gap-1 mb-4">
          <button
              @click="router.push('/servers')"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left',
                isServersActive ? 'bg-main-600 text-white shadow-md' : 'text-text-secondary hover:text-text-default hover:bg-main-700'
              ]"  
          >
            <Server class="w-5 h-5" />
            <span class="text-sm font-medium">Servers</span>
          </button>
          <button
              @click="router.push('/friends')"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left',
                isFriendsActive ? 'bg-main-600 text-white shadow-md' : 'text-text-secondary hover:text-text-default hover:bg-main-700'
              ]"
          >
            <Users class="w-5 h-5" />
            <span class="text-sm font-medium">Friends</span>
            <span v-if="pendingRequestsCount > 0" class="ml-auto inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white">{{ pendingRequestsCount }}</span>
          </button>
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
                class="dm-item group relative"
                :class="{
                  'active': currentDmUserId === conv.userId,
                  'non-friend': !isFriend(conv.userId)
                }"
                @contextmenu.prevent="openContextMenu($event, conv.userId, conv.username)"
            >
              <UserAvatar
                  :user-id="conv.userId"
                  :username="conv.username"
                  :size="24"
                  class="flex-shrink-0"
                  :class="{ 'opacity-60': !isFriend(conv.userId) }"
                  :show-online-indicator="isFriend(conv.userId)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span
                      class="truncate"
                      :class="[
                      'text-sm',
                      !isFriend(conv.userId) ? 'text-text-tertiary opacity-75' :
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
                    :class="[
                      !isFriend(conv.userId) ? 'text-text-tertiary opacity-60' :
                      hasUnread(conv.userId) ? 'text-text-secondary' : 'text-text-tertiary'
                    ]"
                >
                  {{ getMessagePreview(conv.lastMessage) }}
                </p>
              </div>
            </RouterLink>
          </div>
        </div>
        <!-- Context Menu -->
        <div v-if="contextMenu.visible" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" class="fixed z-50 bg-bg-surface border border-border-default rounded-md shadow-lg py-1 w-56">
          <div class="px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">User</div>
          <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="viewProfile">Profile</button>
          <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="inviteToServer" disabled>Invite to server</button>
          <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="friendNickname" disabled>Friend nickname</button>
          <div class="h-px bg-border-default my-1"></div>
          <div class="px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">Conversation</div>
          <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="markAsRead">Mark as read</button>
          <template v-if="!isMuted(contextMenu.userId)">
            <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="muteDm(contextMenu.userId, '15m')">Mute 15 minutes</button>
            <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="muteDm(contextMenu.userId, '1h')">Mute 1 hour</button>
            <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="muteDm(contextMenu.userId, '3h')">Mute 3 hours</button>
            <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="muteDm(contextMenu.userId, '8h')">Mute 8 hours</button>
            <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="muteDm(contextMenu.userId, '24h')">Mute 24 hours</button>
            <button class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="muteDm(contextMenu.userId, 'forever')">Mute until turned back on</button>
          </template>
          <button v-else class="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-main-700" @click="unmuteDm(contextMenu.userId)">Unmute Conversation</button>
          <div class="h-px bg-border-default my-1"></div>
          <button v-if="!isBlocked(contextMenu.userId)" class="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10" @click="blockUser(contextMenu.userId)">Block</button>
          <button v-else class="w-full text-left px-3 py-2 text-sm text-success hover:bg-success/10" @click="unblockUser(contextMenu.userId)">Unblock</button>
        </div>
      </div>
    </template>
  </SidebarContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDmStore } from '@/stores/dm';
import { useFriendStore } from '@/stores/friends';
import { Server, Users, Loader2, X } from 'lucide-vue-next';
import SidebarContainer from '@/components/common/SidebarContainer.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { getMessagePreview } from '@/utils/messagePreview';
import type { EntityId } from '@/services/types';
import { useNotificationPrefs } from '@/stores/notifications';

const route = useRoute();
const router = useRouter();
const dmStore = useDmStore();
const friendStore = useFriendStore();
const prefs = useNotificationPrefs();

const dmLoading = ref(true);
const showSearchModal = ref(false);

// Active state logic
const isServersActive = computed(() => route.path === '/servers');
const isFriendsActive = computed(() => route.path === '/friends');

const currentDmUserId = computed(() =>
    route.name === 'DirectMessage' ? parseInt(route.params.userId as string) : null
);

const conversations = computed(() => dmStore.conversations);
const pendingRequestsCount = computed(() => friendStore.requests.length);

const hasUnread = (userId: EntityId) => dmStore.unreadMessages.has(userId);

// Check if a user is a friend (reactive to friend store changes)
const isFriend = (userId: EntityId) => {
  return friendStore.friends.some(f => f.userId === userId);
};

const closeConversation = async (userId: EntityId) => {
  if (currentDmUserId.value === userId) {
    await router.push('/friends');
  }
  dmStore.closeConversation(userId);
};


// Fetch data on mount
onMounted(async () => {
  // Fetch DM conversations
  dmLoading.value = true;
  try {
    await dmStore.fetchConversations();
    // Fetch friend data for badge and friendship status
    try {
      await Promise.all([
        friendStore.fetchFriends(),
        friendStore.fetchRequests(),
        friendStore.fetchBlocked()
      ]);
    } catch {}
  } finally {
    dmLoading.value = false;
  }
});

// Refresh conversations when route changes
watch(() => route.params.userId, async (newUserId) => {
  if (newUserId) {
    await dmStore.fetchConversations();
  }
});

// Context menu stubs (future expansion)
const contextMenu = ref<{ visible: boolean; x: number; y: number; userId: number; username: string }>({ visible: false, x: 0, y: 0, userId: 0, username: '' });
const openContextMenu = (e: MouseEvent, userId: number, username: string) => {
  e.preventDefault();
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, userId, username };
  const onDocClick = () => {
    contextMenu.value.visible = false;
    document.removeEventListener('click', onDocClick);
  };
  document.addEventListener('click', onDocClick);
};
const isBlocked = (userId: number) => friendStore.blocked.some(b => b.userId === userId);
const blockUser = async (userId: number) => { await friendStore.blockUser(userId); };
const unblockUser = async (userId: number) => { await friendStore.unblockUser(userId); };
const viewProfile = () => {};
const inviteToServer = () => {};
const friendNickname = () => {};
const markAsRead = () => {};

// DM mute helpers
const isMuted = (userId: number) => prefs.isDmMuted(userId);
const muteDm = (userId: number, preset: '15m'|'1h'|'3h'|'8h'|'24h'|'forever') => {
  const d = prefs.Durations;
  const map: Record<string, number | 'forever'> = { '15m': d.m15, '1h': d.h1, '3h': d.h3, '8h': d.h8, '24h': d.h24, 'forever': 'forever' };
  prefs.muteDm(userId, map[preset]);
};
const unmuteDm = (userId: number) => prefs.unmuteDm(userId);
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

.dm-item.non-friend {
  @apply opacity-75;
}

.dm-item.non-friend:hover {
  @apply opacity-90;
}
</style>
