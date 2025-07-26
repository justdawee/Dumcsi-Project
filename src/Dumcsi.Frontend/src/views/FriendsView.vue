<template>
  <div class="flex-1 flex flex-col bg-bg-base">
    <div class="px-6 py-4 border-b border-border-default flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-default">Friends</h1>
      <button class="btn-primary" @click="showAdd = true">Add Friend</button>
    </div>
    <div class="flex flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border-default">
      <div class="flex-1 overflow-y-auto p-4">
        <h2 class="font-semibold text-text-default mb-2">Friends</h2>
        <div v-if="store.loading" class="flex items-center justify-center py-6">
          <Loader2 class="w-6 h-6 text-primary animate-spin" />
        </div>
        <ul v-else class="space-y-2">
          <li v-for="f in store.friendsWithStatus" :key="f.userId" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UserAvatar :user-id="f.userId" :username="f.username" :size="32" show-online-indicator :is-online="f.online" />
              <span class="text-text-default">{{ f.username }}</span>
              <span class="text-xs" :class="f.online ? 'text-green-500' : 'text-text-tertiary'">{{ f.online ? 'Online' : 'Offline' }}</span>
            </div>
            <div class="space-x-2">
              <RouterLink :to="`/dm/${f.userId}`" class="btn-secondary btn-xs">Message</RouterLink>
              <button class="text-danger text-sm hover:underline" @click="remove(f.userId)">Remove</button>
            </div>
          </li>
        </ul>
      </div>
      <div class="w-full md:w-72 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 class="font-semibold text-text-default mb-2">Friend Requests</h3>
          <div v-if="store.requests.length === 0" class="text-sm text-text-muted">No requests</div>
          <ul v-else class="space-y-2">
            <li v-for="r in store.requests" :key="r.requestId" class="flex items-center justify-between">
              <span>{{ r.fromUsername }}</span>
              <div class="space-x-1">
                <button class="btn-primary btn-xs" @click="accept(r.requestId)">Accept</button>
                <button class="btn-secondary btn-xs" @click="decline(r.requestId)">Decline</button>
              </div>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-text-default mb-2">DM Settings</h3>
          <select v-model.number="store.dmFilter" class="form-input w-full" @change="updateDm">
            <option :value="DmFilterOption.AllowAll">No filter</option>
            <option :value="DmFilterOption.FriendsOnly">Filter non-friends</option>
            <option :value="DmFilterOption.AllRequests">Filter all</option>
          </select>
        </div>
      </div>
    </div>
    <AddFriendModal v-model="showAdd" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useFriendStore } from '@/stores/friends';
import { DmFilterOption } from '@/services/types';
import AddFriendModal from '@/components/friend/AddFriendModal.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { Loader2 } from 'lucide-vue-next';

const store = useFriendStore();
const showAdd = ref(false);

onMounted(() => {
  store.fetchFriends();
  store.fetchRequests();
  store.fetchDmSettings();
});

const accept = (id: number) => store.acceptRequest(id);
const decline = (id: number) => store.declineRequest(id);
const remove = (id: number) => store.removeFriend(id);
const updateDm = () => store.updateDmSettings(store.dmFilter);
</script>