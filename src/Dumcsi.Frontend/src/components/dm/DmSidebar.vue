<template>
  <SidebarContainer>
    <template #header>
      <h2 class="font-semibold text-text-default truncate">Direct Messages</h2>
    </template>

    <template #content>
      <ul class="py-2 space-y-0.5">
        <li v-for="c in dmStore.conversations" :key="c.userId">
          <RouterLink
              class="channel-item"
              :class="{ active: currentId === c.userId }"
              :to="`/dm/${c.userId}`"
          >
            <UserAvatar :user-id="c.userId" :username="c.username" :size="24" class="mr-2" />
            <span class="truncate">{{ c.username }}</span>
          </RouterLink>
        </li>
      </ul>
    </template>
  </SidebarContainer>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDmStore } from '@/stores/dm';
import UserAvatar from '@/components/common/UserAvatar.vue';
import SidebarContainer from '@/components/common/SidebarContainer.vue';

const dmStore = useDmStore();
const route = useRoute();
const currentId = computed(() => parseInt(route.params.userId as string, 10));

onMounted(() => {
  if (dmStore.conversations.length === 0) {
    dmStore.fetchConversations();
  }
});
</script>