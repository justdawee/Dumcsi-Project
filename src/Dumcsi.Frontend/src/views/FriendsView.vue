<template>
  <div class="flex h-full w-full bg-bg-base">
    <!-- Home Sidebar -->
    <HomeSidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <div class="h-14 px-4 border-b border-border-default flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Users class="w-6 h-6 text-text-muted" />
          <h1 class="font-semibold text-text-default">Friends</h1>
          <div class="flex items-center ml-4">
            <button
                v-for="tab in tabs"
                :key="tab.value"
                @click="activeTab = tab.value"
                :class="[
                'px-4 py-1.5 rounded text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-main-700 text-text-default'
                  : 'text-text-muted hover:text-text-secondary hover:bg-main-800'
              ]"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <button
            @click="showAddFriend = true"
            class="btn-success text-sm"
        >
          Add Friend
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center h-full">
          <Loader2 class="w-8 h-8 text-text-muted animate-spin" />
        </div>

        <!-- Online Friends -->
        <div v-else-if="activeTab === 'online'" class="p-4">
          <div v-if="onlineFriends.length === 0" class="text-center py-16">
            <UserX class="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p class="text-text-muted">No friends are currently online</p>
          </div>
          <div v-else class="space-y-1">
            <FriendItem
                v-for="friend in onlineFriends"
                :key="friend.userId"
                :friend="friend"
                @message="startDirectMessage"
                @remove="removeFriend"
            />
          </div>
        </div>

        <!-- All Friends -->
        <div v-else-if="activeTab === 'all'" class="p-4">
          <div v-if="sortedFriends.length === 0" class="text-center py-16">
            <Users class="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p class="text-text-muted">You don't have any friends yet</p>
            <button @click="showAddFriend = true" class="btn-primary mt-4">
              Add a Friend
            </button>
          </div>
          <div v-else class="space-y-1">
            <FriendItem
                v-for="friend in sortedFriends"
                :key="friend.userId"
                :friend="friend"
                @message="startDirectMessage"
                @remove="removeFriend"
            />
          </div>
        </div>

        <!-- Pending Requests -->
        <div v-else-if="activeTab === 'pending'" class="p-4">
          <div v-if="friendStore.requests.length === 0" class="text-center py-16">
            <UserPlus class="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p class="text-text-muted">No pending friend requests</p>
          </div>
          <div v-else class="space-y-1">
            <FriendRequestItem
                v-for="request in friendStore.requests"
                :key="request.requestId"
                :request="request"
                @accept="acceptRequest"
                @decline="declineRequest"
            />
          </div>
        </div>

        <!-- DM Settings -->
        <div v-else-if="activeTab === 'settings'" class="p-4">
          <div class="max-w-md">
            <h2 class="text-lg font-semibold text-text-default mb-4">Direct Message Settings</h2>
            <div class="bg-main-800 rounded-lg p-4">
              <label class="block text-sm font-medium text-text-secondary mb-2">
                Who can send you direct messages?
              </label>
              <select
                  v-model.number="friendStore.dmFilter"
                  @change="updateDmSettings"
                  class="form-input w-full"
              >
                <option :value="0">Everyone</option>
                <option :value="1">Friends only</option>
                <option :value="2">No one</option>
              </select>
              <p class="text-xs text-text-tertiary mt-2">
                This setting controls who can start new direct message conversations with you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <AddFriendModal v-model="showAddFriend" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFriendStore } from '@/stores/friends';
import { Users, UserPlus, UserX, Loader2 } from 'lucide-vue-next';
import HomeSidebar from '@/components/common/HomeSidebar.vue';
import FriendItem from '@/components/friend/FriendItem.vue';
import FriendRequestItem from '@/components/friend/FriendRequestItem.vue';
import AddFriendModal from '@/components/friend/AddFriendModal.vue';
import type { EntityId } from '@/services/types';

const router = useRouter();
const friendStore = useFriendStore();

const tabs = [
  { label: 'Online', value: 'online' },
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Settings', value: 'settings' }
];

const activeTab = ref('online');
const showAddFriend = ref(false);
const loading = ref(true);

const sortedFriends = computed(() =>
    [...friendStore.friendsWithStatus].sort((a, b) => {
      if (a.online === b.online) return a.username.localeCompare(b.username);
      return a.online ? -1 : 1;
    })
);

const onlineFriends = computed(() =>
    sortedFriends.value.filter(f => f.online)
);

const startDirectMessage = (userId: EntityId) => {
  router.push(`/dm/${userId}`);
};

const removeFriend = async (userId: EntityId) => {
  if (confirm('Are you sure you want to remove this friend?')) {
    await friendStore.removeFriend(userId);
  }
};

const acceptRequest = async (requestId: EntityId) => {
  await friendStore.acceptRequest(requestId);
};

const declineRequest = async (requestId: EntityId) => {
  await friendStore.declineRequest(requestId);
};

const updateDmSettings = async () => {
  await friendStore.updateDmSettings(friendStore.dmFilter);
};

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      friendStore.fetchFriends(),
      friendStore.fetchRequests(),
      friendStore.fetchDmSettings()
    ]);
  } finally {
    loading.value = false;
  }
});
</script>