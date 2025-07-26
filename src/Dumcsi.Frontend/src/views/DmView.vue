<template>
  <div class="flex-1 flex h-full overflow-hidden">
    <DmSidebar />
    <div class="flex-1 bg-bg-base overflow-hidden">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import DmSidebar from '@/components/dm/DmSidebar.vue';
import { useDmStore } from '@/stores/dm';

const dmStore = useDmStore();

onMounted(() => {
  dmStore.fetchConversations();
});
</script>