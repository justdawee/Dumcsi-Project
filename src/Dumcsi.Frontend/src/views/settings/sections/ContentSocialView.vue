<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Shield class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sections.contentSocial') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.content.subtitle') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Direct Message Settings -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">{{ t('friends.settings.title') }}</h2>
              <p class="text-xs text-text-tertiary mt-1">{{ t('friends.settings.hint') }}</p>
            </div>
          </div>
          <div class="p-5">
            <label class="block text-sm font-medium text-text-secondary mb-2">{{ t('friends.settings.whoCanMessage') }}</label>
            <select
              v-model.number="friendStore.dmFilter"
              @change="updateDmSettings"
              class="form-input w-full max-w-md"
              :disabled="loading"
            >
              <option :value="0">{{ t('friends.settings.options.everyone') }}</option>
              <option :value="1">{{ t('friends.settings.options.friendsOnly') }}</option>
              <option :value="2">{{ t('friends.settings.options.noOne') }}</option>
            </select>
          </div>
        </section>

        <!-- DM Requests -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">DM Requests</h2>
            <p class="text-xs text-text-tertiary mt-1">Pending DM requests requiring your approval.</p>
          </div>
          <div class="p-4">
            <div v-if="dmRequestsLoading" class="py-8 text-center text-text-muted">Loading...</div>
            <div v-else-if="friendStore.dmRequests.length === 0" class="py-8 text-center text-text-muted">No DM requests</div>
            <div v-else class="space-y-2">
              <div
                v-for="req in friendStore.dmRequests"
                :key="req.id"
                class="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-border-default hover:bg-bg-hover transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-text-default truncate">{{ req.fromUsername }}</div>
                  <div class="text-xs text-text-tertiary truncate">{{ req.initialMessage }}</div>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn-success btn-sm" @click="acceptDm(req.id)">Accept</button>
                  <button class="btn-secondary btn-sm" @click="declineDm(req.id)">Decline</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Friend Requests -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">Friend Requests</h2>
            <p class="text-xs text-text-tertiary mt-1">Manage incoming friend requests.</p>
          </div>
          <div class="p-4">
            <div v-if="loading" class="py-8 text-center text-text-muted">Loading...</div>
            <div v-else-if="friendStore.requests.length === 0" class="py-8 text-center text-text-muted">No pending friend requests</div>
            <div v-else class="space-y-2 max-w-2xl">
              <FriendRequestItem
                v-for="request in friendStore.requests"
                :key="request.requestId"
                :request="request"
                @accept="acceptRequest"
                @decline="declineRequest"
                @block="blockUser"
              />
            </div>
          </div>
        </section>

        <!-- Blocked Users -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">Blocked Users</h2>
            <p class="text-xs text-text-tertiary mt-1">View and manage your blocked list.</p>
          </div>
          <div class="p-4">
            <div v-if="loading" class="py-8 text-center text-text-muted">Loading...</div>
            <div v-else-if="friendStore.blocked.length === 0" class="py-8 text-center text-text-muted">No blocked users</div>
            <div v-else class="space-y-2">
              <div
                v-for="user in friendStore.blocked"
                :key="user.userId"
                class="flex items-center px-4 py-3 hover:bg-bg-hover rounded-lg transition-colors border border-border-default"
              >
                <UserAvatar :user-id="user.userId" :username="user.username" :size="40" />
                <div class="flex-1 ml-3">
                  <span class="font-medium text-text-default">{{ user.username }}</span>
                </div>
                <button class="btn-secondary text-sm" @click="unblockUser(user.userId)">{{ t('friends.request.unblock') }}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Shield } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useFriendStore } from '@/stores/friends';
import FriendRequestItem from '@/components/friend/FriendRequestItem.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type { EntityId } from '@/services/types';

const { t } = useI18n();
const friendStore = useFriendStore();
const loading = ref(true);
const dmRequestsLoading = ref(true);

const acceptRequest = async (requestId: EntityId) => {
  await friendStore.acceptRequest(requestId);
};

const declineRequest = async (requestId: EntityId) => {
  await friendStore.declineRequest(requestId);
};

const blockUser = async (userId: EntityId) => {
  await friendStore.blockUser(userId);
};

const unblockUser = async (userId: EntityId) => {
  await friendStore.unblockUser(userId);
};

const updateDmSettings = async () => {
  await friendStore.updateDmSettings(friendStore.dmFilter);
};

const acceptDm = async (id: EntityId) => {
  await friendStore.acceptDmRequest(id);
};

const declineDm = async (id: EntityId) => {
  await friendStore.declineDmRequest(id);
};

onMounted(async () => {
  loading.value = true;
  dmRequestsLoading.value = true;
  try {
    await Promise.all([
      friendStore.fetchRequests(),
      friendStore.fetchBlocked(),
      friendStore.fetchDmSettings()
    ]);
  } finally {
    loading.value = false;
  }
  try {
    await friendStore.fetchDmRequests();
  } finally {
    dmRequestsLoading.value = false;
  }
});
</script>
