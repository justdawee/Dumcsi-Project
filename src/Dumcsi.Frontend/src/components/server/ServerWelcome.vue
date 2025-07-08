<template>
  <div class="flex-1 flex items-center justify-center p-8">
    <div v-if="server" class="text-center max-w-md">
      <div class="w-32 h-32 mx-auto mb-6 bg-gray-700 rounded-full flex items-center justify-center">
        <MessageSquare class="w-16 h-16 text-gray-500" />
      </div>
      <h1 class="text-3xl font-bold text-white mb-3">
        Welcome to {{ server.name }}!
      </h1>
      <p class="text-gray-400 mb-6">
        {{ server.description || 'Select a channel from the sidebar to start chatting.' }}
      </p>
      
      <div v-if="server.channels?.length > 0" class="space-y-2">
        <p class="text-sm text-gray-500 mb-3">Quick jump to:</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <RouterLink
            v-for="channel in server.channels.slice(0, 5)"
            :key="channel.id"
            :to="`/servers/${server.id}/channels/${channel.id}`"
            class="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm text-gray-300 hover:text-white transition"
          >
            <Hash class="w-3 h-3" />
            {{ channel.name }}
          </RouterLink>
        </div>
      </div>
      
      <div class="mt-8">
        <div 
          class="relative inline-block" 
          :title="!canInvite ? 'You do not have permission to create invites.' : ''"
        >
          <button
            @click="handleGenerateInvite"
            :disabled="generatingInvite || !canInvite"
            class="btn-primary inline-flex items-center gap-2"
          >
            <UserPlus v-if="!generatingInvite" class="w-5 h-5" />
            <Loader2 v-else class="w-5 h-5 animate-spin" />
            Generate Invite Link
          </button>
        </div>
      </div>
    </div>
    <!-- Loading Spinner -->
    <div v-else>
        <Loader2 class="w-8 h-8 text-gray-500 animate-spin" />
    </div>
  </div>

  <!-- A modális ablak hívása változatlan -->
  <InviteModal
    v-model="isInviteModalOpen"
    :server="server"
    :invite-code="generatedInviteCode"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { MessageSquare, Hash, UserPlus, Loader2 } from 'lucide-vue-next';
import serverService from '@/services/serverService';
import type { ServerDetail } from '@/services/types';
import { Permission } from '@/services/types';
import { useToast } from '@/composables/useToast';
import InviteModal from '@/components/modals/InviteModal.vue';

const { addToast } = useToast();

const props = defineProps<{
  server: ServerDetail | null;
}>();

const generatedInviteCode = ref('');
const generatingInvite = ref(false);
const isInviteModalOpen = ref(false);

const canInvite = computed(() => {
  if (!props.server) return false;
  const userPermissions = props.server.currentUserPermissions;
  return (userPermissions & Permission.Administrator) === Permission.Administrator || 
         (userPermissions & Permission.CreateInvite) === Permission.CreateInvite;
});

const handleGenerateInvite = async () => {
  if (!props.server || !canInvite.value) return;

  generatingInvite.value = true;
  try {
    const response = await serverService.generateInvite(props.server.id);
    generatedInviteCode.value = response.data.code;
    isInviteModalOpen.value = true;
  } catch (error) {
    addToast({
      type: 'danger',
      message: 'Failed to generate invite link.',
    });
  } finally {
    generatingInvite.value = false;
  }
};
</script>

<style scoped>
@reference "@/style.css";

.btn-primary {
  @apply px-4 py-2 bg-primary hover:bg-primary-hover text-white 
           font-medium rounded-lg transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-primary/50
           disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
