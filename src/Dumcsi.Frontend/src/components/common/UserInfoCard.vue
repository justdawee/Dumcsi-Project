<template>
  <Teleport to="body">
    <div
        v-if="visible"
        ref="cardRef"
        :style="positionStyle"
        class="fixed z-50"
    >
      <div class="w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 relative overflow-hidden">
        <div class="h-20 bg-[#765159]"></div>

        <div class="absolute top-2 right-2 flex space-x-2">
          <button
              v-if="canManageRoles"
              :disabled="availableRoles.length === 0"
              class="p-1 bg-gray-700 rounded-full hover:bg-gray-600 disabled:opacity-50"
              @click.stop="openAddRoleMenu"
          >
            <Plus class="w-4 h-4 text-white" />
          </button>
          <button
              v-if="canManageRoles"
              ref="shieldRef"
              class="p-1 bg-gray-700 rounded-full hover:bg-gray-600"
              @click.stop.prevent="togglePermissions"
          >
            <Shield class="w-4 h-4 text-white" />
          </button>
          <button
              class="p-1 bg-gray-700 rounded-full hover:bg-gray-600"
              @click="emit('update:modelValue', false)"
          >
            <X class="w-4 h-4 text-white" />
          </button>
        </div>

        <div class="flex flex-col items-start px-3 -mt-8 pb-3">
          <UserAvatar
              :avatar-url="avatarUrl"
              :user-id="userId"
              :username="user.username"
              :size="80"
              show-online-indicator
              indicator-bg-color="var(--color-main-800)"
              class="rounded-full ring-4 ring-gray-800"
          />
          <p class="mt-3 text-lg font-semibold text-white truncate">
            {{ displayName }}
          </p>
          <p class="text-sm text-gray-400 truncate">{{ user.username }}</p>
          <p v-if="mutualServersCount" class="text-xs text-gray-400 mt-1">
            {{ mutualServersCount }} Mutual Servers
          </p>
          <div class="flex items-center space-x-1 mt-2 flex-wrap justify-start">
            <template v-for="role in sortedRoles" :key="role.id">
              <div class="flex items-center gap-1">
                <div class="relative group w-3 h-3 rounded-full" :style="{ backgroundColor: role.color }">
                  <button
                      v-if="canManageRoles"
                      class="absolute inset-0 flex items-center justify-center rounded-full text-[10px] bg-black/60 text-white opacity-0 group-hover:opacity-100"
                      @click.stop="removeRole(role)"
                  >
                    <X class="w-2 h-2" />
                  </button>
                </div>
                <span class="text-xs text-gray-300">{{ role.name }}</span>
              </div>
            </template>
          </div>
          <button
              class="mt-4 w-full bg-secondary hover:bg-secondary/50 text-white text-sm font-medium py-1.5 rounded"
              @click="messageUser"
          >
            Message
          </button>
        </div>

        <div
            v-show="showPermissions"
            ref="permPopup"
            :style="permPopupStyle"
            class="absolute bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 z-50"
        >
          <div class="flex flex-wrap gap-1 max-w-[14rem]">
            <span
                v-for="perm in permissionNames"
                :key="perm"
                class="bg-main-700 text-xs rounded px-2 py-1 text-white"
            >
              {{ perm }}
            </span>
          </div>
        </div>

        <ContextMenu ref="roleMenu" :items="roleMenuItems" />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch, nextTick} from 'vue';
import { Permission, type ServerMember, type Role } from '@/services/types';
import UserAvatar from './UserAvatar.vue';
import ContextMenu, { type MenuItem } from '@/components/ui/ContextMenu.vue';
import { Plus, Shield, X } from 'lucide-vue-next';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {useAppStore} from '@/stores/app';
import {usePermissions} from '@/composables/usePermissions';
import roleService from '@/services/roleService';

const props = defineProps<{
  user: ServerMember;
  x: number;
  y: number;
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'message']);

const cardRef = ref<HTMLElement | null>(null);
const shieldRef = ref<HTMLElement | null>(null);
const permPopupStyle = ref<Record<string, string>>({ left: '0px', top: '0px' });
const visible = computed(() => props.modelValue);

const { getAvatarUrl, getDisplayName } = useUserDisplay();

const displayName = computed(() => getDisplayName(props.user));
const avatarUrl = computed(() => getAvatarUrl(props.user));
const userId = computed(() => {
  if ('userId' in props.user) return props.user.userId;
  return (props.user as any).id as number;
});

const appStore = useAppStore();
const { permissions, canManageMember, getPermissionDisplayName } = usePermissions();

const canManageRoles = computed(() =>
    permissions.manageRoles.value && canManageMember(props.user.userId).value
);

// additional info
const mutualServersCount = computed(
    () => (props.user as any).mutualServers?.length ?? 0
);

const messageUser = () => {
  emit('message', props.user.userId);
};

const sortedRoles = computed(() =>
    [...props.user.roles].sort((a, b) => b.position - a.position)
);

const availableRoles = computed(() => {
  const all = appStore.currentServer?.roles || [];
  const assigned = new Set(props.user.roles.map(r => r.id));
  return all.filter(r => !assigned.has(r.id) && r.name !== '@everyone');
});

const showPermissions = ref(false);
const roleMenu = ref<InstanceType<typeof ContextMenu> | null>(null);

const roleMenuItems = computed<MenuItem[]>(() =>
    availableRoles.value.map(role => ({
      label: role.name,
      icon: Plus,
      action: () => addRole(role)
    }))
);

const permissionValue = computed(() =>
    props.user.roles.reduce((acc, r) => acc | r.permissions, 0)
);

const permissionNames = computed(() => {
  const names: string[] = [];
  Object.values(Permission).forEach(val => {
    if (typeof val === 'number' && val !== Permission.None && (permissionValue.value & val) !== 0) {
      names.push(getPermissionDisplayName(val as Permission));
    }
  });
  return names;
});

const addRole = async (role: Role) => {
  const serverId = appStore.currentServer?.id;
  if (!serverId) return;
  const newIds = [...props.user.roles.map(r => r.id), role.id];
  await roleService.updateMemberRoles(serverId, props.user.userId, newIds);
};

const removeRole = async (role: Role) => {
  const serverId = appStore.currentServer?.id;
  if (!serverId) return;
  const newIds = props.user.roles.filter(r => r.id !== role.id).map(r => r.id);
  await roleService.updateMemberRoles(serverId, props.user.userId, newIds);
};

const openAddRoleMenu = (e: MouseEvent) => {
  roleMenu.value?.open(e);
};

const togglePermissions = () => {
  showPermissions.value = !showPermissions.value;
  nextTick(() => {
    if (showPermissions.value && shieldRef.value && cardRef.value) {
      const shieldRect = shieldRef.value.getBoundingClientRect();
      const cardRect = cardRef.value.getBoundingClientRect();
      permPopupStyle.value = {
        left: `${shieldRect.left - cardRect.left}px`,
        top: `${shieldRect.bottom - cardRect.top + 4}px`,
      };
    }
  });
};

const positionStyle = computed(() => {
  let left = props.x;
  let top = props.y;
  const cardWidth = 256; // w-64
  const cardHeight = 80; // approximate
  if (typeof window !== 'undefined') {
    if (left + cardWidth > window.innerWidth) {
      left = window.innerWidth - cardWidth - 10;
    }
    if (left < 0) {
      left = 10;
    }
    if (top + cardHeight > window.innerHeight) {
      top = window.innerHeight - cardHeight - 10;
    }
    if (top < 0) {
      top = 10;
    }
  }
  return { left: `${left}px`, top: `${top}px` };
});

const handleClickOutside = (e: MouseEvent) => {
  if (cardRef.value && !cardRef.value.contains(e.target as Node)) {
    emit('update:modelValue', false);
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch(() => props.modelValue, (val) => {
  if (!val) {
    showPermissions.value = false;
  }
});
</script>

<style scoped>
</style>
