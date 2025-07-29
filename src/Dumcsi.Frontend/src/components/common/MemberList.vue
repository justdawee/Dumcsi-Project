<template>
  <div class="w-66 bg-main-900 border-l border-main-700 py-4 animate-slide-in flex flex-col">
    <h3 class="font-semibold text-text-default mb-4 px-4">Members - {{ members.length }}</h3>
    <div v-if="appStore.loading.members" class="flex justify-center items-center h-full px-4">
      <Loader2 class="w-6 h-6 text-text-tertiary animate-spin"/>
    </div>
    <ul v-else class="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
      <li
          v-for="member in members"
          :key="member.userId"
          class="flex items-center gap-3 cursor-pointer hover:bg-main-700/20 p-1 px-4 rounded member-item"
          @click="openMemberInfo(member, $event)"
      >
        <UserAvatar
            :avatar-url="member.avatarUrl"
            :is-typing="isTyping(member.userId)"
            :size="32"
            :user-id="member.userId"
            :username="member.username"
            indicator-bg-color="var(--color-main-900)"
            show-online-indicator
        />
        <div class="flex-1 min-w-0">
        <span class="font-medium text-sm truncate block" :style="{ color: getRoleColor(member) }">
          {{ getDisplayName(member) }}
        </span>
        </div>
        <div v-if="canManageMember(member.userId).value" class="flex gap-1">
          <button
              v-if="permissions.kickMembers"
              class="p-1 text-text-muted hover:text-red-400 transition"
              title="Kick Member"
              @click="kickMember()"
          >
            <UserX class="w-4 h-4"/>
          </button>
          <button
              v-if="permissions.banMembers"
              class="p-1 text-text-muted hover:text-red-500 transition"
              title="Ban Member"
              @click="banMember()"
          >
            <Ban class="w-4 h-4"/>
          </button>
        </div>
      </li>
    </ul>
  </div>
  <UserInfoCard
      v-if="infoCardMember"
      v-model="infoCardVisible"
      :user="infoCardMember"
      :x="infoCardPos.x"
      :y="infoCardPos.y"
  />
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import { usePermissions } from '@/composables/usePermissions';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { Loader2, UserX, Ban } from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import UserInfoCard from '@/components/common/UserInfoCard.vue';
import type { EntityId, ServerMember } from '@/services/types';

interface Props {
  isTyping: (userId: EntityId) => boolean;
}

const props = defineProps<Props>();

const authStore = useAuthStore();
const appStore = useAppStore();
const { addToast } = useToast();
const { getDisplayName } = useUserDisplay();
const { permissions, canManageMember } = usePermissions();

const infoCardMember = ref<ServerMember | null>(null);
const infoCardVisible = ref(false);
const infoCardPos = ref({ x: 0, y: 0 });

watch(infoCardVisible, (val) => {
  if (!val) infoCardMember.value = null;
});

const members = computed(() => {
  const allMembers = appStore.members;
  const currentUserId = authStore.user?.id;

  // Ensure self is marked as online
  if (currentUserId && appStore.connectionState === 'connected') {
    const selfMember = allMembers.find(m => m.userId === currentUserId);
    if (selfMember) {
      selfMember.isOnline = true;
    }
  }

  return allMembers;
});

const isTyping = (userId: EntityId) => props.isTyping(userId);

const getRoleColor = (member: ServerMember): string => {
  if (member.roles.length === 0) {
    return 'rgb(185 185 185)'; // Default gray color for members without roles
  }
  
  // Get the highest priority role (roles are typically sorted by priority)
  const highestRole = member.roles[0];
  return highestRole.color || 'rgb(185 185 185)';
};

const kickMember = async () => {
  addToast({ type: 'info', message: 'Kick member functionality coming soon!' });
};

const banMember = async () => {
  addToast({ type: 'info', message: 'Ban member functionality coming soon!' });
};

const openMemberInfo = (member: ServerMember, event: MouseEvent) => {
  event.stopPropagation();
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const cardWidth = 256;
  const offset = 8;
  infoCardPos.value = { x: rect.left - cardWidth - offset, y: rect.top };
  infoCardMember.value = member;
  infoCardVisible.value = true;
};
</script>