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
      
      <!-- JAVÍTOTT RÉSZ: A gomb most már mindig látszik, de a tooltip és a disabled állapot kezeli a jogosultságot -->
      <div class="mt-8">
        <!-- A 'div' wrapper azért kell, hogy a tooltip akkor is működjön, ha a gomb le van tiltva -->
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
    
    <!-- A töltésjelző csak akkor jelenik meg, ha a szerver adatai még egyáltalán nem töltődtek be -->
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
import { Role } from '@/services/types'; // Importáljuk a Role enumot
import InviteModal from '@/components/modals/InviteModal.vue';

const props = defineProps<{
  server: ServerDetail | null;
}>();

const generatedInviteCode = ref('');
const generatingInvite = ref(false);
const isInviteModalOpen = ref(false);

// A jogosultság ellenőrzése most már a központi Role enumot használja a jobb olvashatóságért
const canInvite = computed(() => (props.server?.currentUserRole ?? Role.Member) > Role.Member);

const handleGenerateInvite = async () => {
  // A 'canInvite' a gomb letiltásával már eleve megakadályozza a felesleges hívást,
  // de egy extra ellenőrzés sosem árt.
  if (!props.server || !canInvite.value) return;

  generatingInvite.value = true;
  try {
    const response = await serverService.generateInvite(props.server.id);
    generatedInviteCode.value = response.data.inviteCode;
    isInviteModalOpen.value = true;
  } catch (error) {
    console.error('Failed to generate invite:', error);
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