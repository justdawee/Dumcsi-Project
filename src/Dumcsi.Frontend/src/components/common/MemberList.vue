<template>
  <div class="w-66 bg-main-900 border-l border-main-700 py-4 animate-slide-in flex flex-col">
    <h3 class="font-semibold text-text-default mb-4 px-4">{{ t('members.list.title', { count: members.length }) }}</h3>
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
        <span :style="getRoleStyle(member)" :class="['font-medium text-sm truncate block', { 'role-badge': shouldBadge(member) }]">
          {{ getDisplayName(member) }}
        </span>
        </div>
        <div v-if="canManageMember(member.userId).value" class="flex gap-1">
          <button
              v-if="permissions.kickMembers"
              class="p-1 text-text-muted hover:text-red-400 transition"
              :title="t('members.list.kickTooltip')"
              @click="kickMember()"
          >
            <UserX class="w-4 h-4"/>
          </button>
          <button
              v-if="permissions.banMembers"
              class="p-1 text-text-muted hover:text-red-500 transition"
              :title="t('members.list.banTooltip')"
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
import {computed, ref, watch, watchEffect} from 'vue';
import { useI18n } from 'vue-i18n';
import {useAuthStore} from '@/stores/auth';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {usePermissions} from '@/composables/usePermissions';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {Ban, Loader2, UserX} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import UserInfoCard from '@/components/common/UserInfoCard.vue';
import type {EntityId, ServerMember} from '@/services/types';

interface Props {
  isTyping: (userId: EntityId) => boolean;
}

const props = defineProps<Props>();

const authStore = useAuthStore();
const appStore = useAppStore();
const {addToast} = useToast();
const {getDisplayName} = useUserDisplay();
const {permissions, canManageMember} = usePermissions();
const { t } = useI18n();

const infoCardMember = ref<ServerMember | null>(null);
const infoCardVisible = ref(false);
const infoCardPos = ref({x: 0, y: 0});

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

// Map of memberId -> color, kept in sync with server roles
const memberRoleColorMap = ref<Record<EntityId, string>>({});

const updateMemberRoleColors = () => {
  const serverRoles = appStore.currentServer?.roles || [];
  const map: Record<EntityId, string> = {};

  appStore.members.forEach(member => {
    if (member.roles.length === 0) {
      map[member.userId] = 'rgb(185 185 185)';
      return;
    }

    const highestRoleId = member.roles[0].id;
    const serverRole = serverRoles.find(r => r.id === highestRoleId);
    map[member.userId] = serverRole?.color ?? member.roles[0].color ?? 'rgb(185 185 185)';
  });

  memberRoleColorMap.value = map;
};

watchEffect(() => {
  updateMemberRoleColors();
});

const getRoleColor = (member: ServerMember): string => {
  return memberRoleColorMap.value[member.userId] ?? 'rgb(185 185 185)';
};

// Helper to detect current effective theme (light when data-theme="light")
function isLightTheme(): boolean {
  try { return document.documentElement.getAttribute('data-theme') === 'light'; } catch { return false; }
}

function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  if (!color) return null;
  const hex = color.trim().toLowerCase();
  // #rgb or #rrggbb
  if (hex.startsWith('#')) {
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }
  // rgb or rgba
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(',').map(x => parseFloat(x.trim()));
    if (parts.length >= 3) {
      const [r, g, b] = parts;
      return { r, g, b };
    }
  }
  // Named colors or hsl not supported here
  return null;
}

function isTooLight(color: string): boolean {
  const rgb = parseColorToRgb(color);
  if (!rgb) return false;
  // Relative luminance approximation
  const srgb = [rgb.r, rgb.g, rgb.b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return L > 0.85; // very light
}

function getContrastText(color: string): string {
  const rgb = parseColorToRgb(color);
  if (!rgb) return '#000000';
  const L = (0.2126 * (rgb.r / 255) + 0.7152 * (rgb.g / 255) + 0.0722 * (rgb.b / 255));
  return L > 0.5 ? '#000000' : '#ffffff';
}

const shouldBadge = (member: ServerMember): boolean => {
  const color = getRoleColor(member);
  return isLightTheme() && isTooLight(color);
};

const getRoleStyle = (member: ServerMember): Record<string, string> => {
  const color = getRoleColor(member);
  if (shouldBadge(member)) {
    const fg = getContrastText(color);
    return { color: fg, backgroundColor: color, border: '1px solid rgba(0,0,0,0.12)' };
  }
  return { color };
};

const kickMember = async () => {
  addToast({ type: 'info', message: t('members.list.toastKickSoon') });
};

const banMember = async () => {
  addToast({ type: 'info', message: t('members.list.toastBanSoon') });
};

const openMemberInfo = (member: ServerMember, event: MouseEvent) => {
  event.stopPropagation();
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const cardWidth = 256;
  const offset = 8;
  infoCardPos.value = {x: rect.left - cardWidth - offset, y: rect.top};
  infoCardMember.value = member;
  infoCardVisible.value = true;
};
</script>

<style scoped>
.role-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
}
</style>
