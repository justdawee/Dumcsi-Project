<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
        v-backdrop-close="closeModal"
    >
      <div class="w-full max-w-4xl transform rounded-2xl bg-bg-surface text-left align-middle shadow-xl transition-all border border-border-default/50">
        
        <!-- Header -->
        <div class="p-6 border-b border-border-default">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <UserAvatar
                  v-if="server"
                  :avatar-url="server.icon"
                  :size="48"
                  :username="server.name"
              />
              <div>
                <h3 class="text-xl font-bold text-text-default">Server Invites</h3>
                <p class="text-sm text-text-muted">{{ server?.name }}</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <button 
                @click="cleanupExpiredInvites" 
                :disabled="cleaningUp"
                class="btn-secondary flex items-center space-x-2"
              >
                <Trash2 class="w-4 h-4" />
                <span>{{ cleaningUp ? 'Cleaning...' : 'Cleanup Expired' }}</span>
              </button>
              <button @click="openCreateInviteModal" class="btn-primary flex items-center space-x-2">
                <Plus class="w-4 h-4" />
                <span>Create Invite</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Loading state -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <Loader2 class="w-8 h-8 animate-spin text-primary" />
          </div>

          <!-- Empty state -->
          <div v-else-if="invites.length === 0" class="text-center py-12">
            <UserPlus class="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h4 class="text-lg font-medium text-text-default mb-2">No invites yet</h4>
            <p class="text-text-muted mb-4">Create your first invite to start inviting people to this server.</p>
            <button @click="openCreateInviteModal" class="btn-primary">Create Invite</button>
          </div>

          <!-- Invites list -->
          <div v-else class="space-y-3">
            <div 
              v-for="invite in invites" 
              :key="invite.code"
              class="bg-bg-base rounded-lg p-4 border border-border-default/50"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <!-- Invite code -->
                    <code class="bg-main-800 px-3 py-1 rounded text-sm font-mono tracking-wider">
                      {{ invite.code }}
                    </code>
                    
                    <!-- Status badges -->
                    <div class="flex items-center space-x-2">
                      <span v-if="invite.isExpired" class="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                        Expired
                      </span>
                      <span v-else-if="invite.isMaxUsesReached" class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                        Max uses reached
                      </span>
                      <span v-else class="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                        Active
                      </span>
                      
                      <span v-if="invite.isTemporary" class="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                        Temporary
                      </span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-text-muted">
                    <!-- Creator -->
                    <div class="flex items-center space-x-2">
                      <User class="w-4 h-4" />
                      <span>{{ invite.creatorUsername }}</span>
                    </div>

                    <!-- Channel -->
                    <div class="flex items-center space-x-2">
                      <Hash class="w-4 h-4" />
                      <span>{{ invite.channelName || 'Any channel' }}</span>
                    </div>

                    <!-- Uses -->
                    <div class="flex items-center space-x-2">
                      <Users class="w-4 h-4" />
                      <span>
                        {{ invite.currentUses }}{{ invite.maxUses > 0 ? `/${invite.maxUses}` : '' }} uses
                      </span>
                    </div>

                    <!-- Expiration -->
                    <div class="flex items-center space-x-2">
                      <Clock class="w-4 h-4" />
                      <span>
                        {{ invite.expiresAt ? formatExpirationTime(invite.expiresAt) : 'Never expires' }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-2 text-xs text-text-muted">
                    Created {{ formatRelativeTime(invite.createdAt) }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center space-x-2 ml-4">
                  <button 
                    @click="copyInviteCode(invite.code)"
                    class="p-2 text-text-muted hover:text-text-default hover:bg-bg-hover rounded-md transition-colors"
                    title="Copy invite code"
                  >
                    <Copy class="w-4 h-4" />
                  </button>
                  
                  <button 
                    @click="deleteInvite(invite.code)"
                    :disabled="deletingInvites.has(invite.code)"
                    class="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Delete invite"
                  >
                    <Trash2 v-if="!deletingInvites.has(invite.code)" class="w-4 h-4" />
                    <Loader2 v-else class="w-4 h-4 animate-spin" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-border-default flex justify-end">
          <button @click="closeModal" class="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>

</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { 
  Plus, 
  Trash2, 
  Copy, 
  User, 
  Users, 
  Hash, 
  Clock, 
  UserPlus,
  Loader2 
} from 'lucide-vue-next';
import type { ServerListItem, InviteDto } from '@/services/types';
import UserAvatar from '@/components/common/UserAvatar.vue';
import serverService from '@/services/serverService';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
}>();

const emit = defineEmits(['update:modelValue', 'openCreateInvite']);

const { addToast } = useToast();

const invites = ref<InviteDto[]>([]);
const loading = ref(false);
const cleaningUp = ref(false);
const deletingInvites = ref(new Set<string>());

const closeModal = () => {
  emit('update:modelValue', false);
};

const openCreateInviteModal = () => {
  emit('openCreateInvite');
};

const refreshInvites = () => {
  loadInvites();
};

const loadInvites = async () => {
  if (!props.server) return;
  
  loading.value = true;
  try {
    invites.value = await serverService.getServerInvites(props.server.id);
  } catch (error: any) {
    console.error('Failed to load invites:', error);
    addToast({ 
      type: 'danger', 
      message: error.message || 'Failed to load invites' 
    });
  } finally {
    loading.value = false;
  }
};

const copyInviteCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    addToast({ type: 'success', message: 'Invite code copied to clipboard!' });
  } catch (error) {
    console.error('Failed to copy invite code:', error);
    addToast({ type: 'danger', message: 'Failed to copy invite code' });
  }
};

const deleteInvite = async (code: string) => {
  if (!props.server) return;
  
  deletingInvites.value.add(code);
  try {
    await serverService.deleteInvite(props.server.id, code);
    invites.value = invites.value.filter(invite => invite.code !== code);
    addToast({ type: 'success', message: 'Invite deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete invite:', error);
    addToast({ 
      type: 'danger', 
      message: error.message || 'Failed to delete invite' 
    });
  } finally {
    deletingInvites.value.delete(code);
  }
};

const cleanupExpiredInvites = async () => {
  if (!props.server) return;
  
  cleaningUp.value = true;
  try {
    const result = await serverService.cleanupExpiredInvites(props.server.id);
    addToast({ 
      type: 'success', 
      message: `Cleaned up ${result.cleanedUp} expired invites` 
    });
    await loadInvites(); // Reload the list
  } catch (error: any) {
    console.error('Failed to cleanup invites:', error);
    addToast({ 
      type: 'danger', 
      message: error.message || 'Failed to cleanup expired invites' 
    });
  } finally {
    cleaningUp.value = false;
  }
};


const formatExpirationTime = (expiresAt: string): string => {
  const date = new Date(expiresAt);
  const now = new Date();
  
  if (date < now) {
    return 'Expired';
  }
  
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 24) {
    return `${diffHours}h remaining`;
  } else {
    return `${diffDays}d remaining`;
  }
};

const formatRelativeTime = (createdAt: string): string => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};

// Load invites when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    loadInvites();
  }
});

// Expose methods for parent components
defineExpose({
  refreshInvites
});
</script>