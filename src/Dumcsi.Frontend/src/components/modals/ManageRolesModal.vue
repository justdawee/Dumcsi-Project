<template>
  <BaseModal
      :model-value="modelValue"
      :title="t('roles.admin.title')"
      @close="close"
      @update:modelValue="val => emit('update:modelValue', val)"
  >
    <template #default>
      <div class="space-y-6">
        <!-- Create New Role Section -->
        <div v-if="!isCreatingRole" class="flex justify-between items-center">
          <h3 class="text-lg font-semibold text-text-default">{{ t('roles.admin.serverRoles') }}</h3>
          <button
              class="btn btn-primary"
              @click="startCreatingRole"
          >
            <Plus class="w-4 h-4 mr-2"/>
            {{ t('roles.admin.createRole') }}
          </button>
        </div>

        <!-- New Role Creation Form -->
        <div v-if="isCreatingRole" class="bg-bg-surface p-4 rounded-lg space-y-4">
          <h4 class="font-semibold text-text-default">{{ t('roles.admin.createNewTitle') }}</h4>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('roles.admin.roleName') }}</label>
              <input
                  v-model="newRole.name"
                  class="input"
                  :placeholder="t('roles.admin.roleNamePlaceholder')"
                  type="text"
                  @keyup.enter="createRole"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('roles.admin.roleColor') }}</label>
              <div class="flex items-center gap-3">
                <input
                    v-model="newRole.color"
                    class="h-10 w-20 rounded cursor-pointer"
                    type="color"
                />
                <input
                    v-model="newRole.color"
                    class="input flex-1"
                    placeholder="#ffffff"
                    type="text"
                />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="newRole.isHoisted"
                    class="checkbox"
                    type="checkbox"
                />
                <span class="text-sm text-text-secondary">{{ t('roles.admin.displaySeparately') }}</span>
              </label>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="newRole.isMentionable"
                    class="checkbox"
                    type="checkbox"
                />
                <span class="text-sm text-text-secondary">{{ t('roles.admin.allowMention') }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button class="btn btn-secondary" @click="cancelCreatingRole">{{ t('common.cancel') }}</button>
            <button :disabled="!newRole.name" class="btn btn-primary" @click="createRole">{{ t('common.create') }}</button>
          </div>
        </div>

        <!-- Existing Roles List -->
        <div v-if="!isCreatingRole && roles.length > 0" class="space-y-2">
          <div
              v-for="role in sortedRoles"
              :key="role.id"
              class="bg-bg-surface rounded-lg p-4 flex items-center justify-between hover:bg-main-700 transition cursor-pointer"
              @click="selectRole(role)"
          >
            <div class="flex items-center gap-3">
              <div
                  :style="{ backgroundColor: role.color }"
                  class="w-4 h-4 rounded-full"
              ></div>
              <span class="font-medium text-text-default">{{ role.name }}</span>
              <span v-if="role.name === '@everyone'" class="text-xs text-text-tertiary">(default)</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-text-secondary">{{ getMemberCount(role) }} {{ t(getMemberCount(role) === 1 ? 'roles.admin.member' : 'roles.admin.members') }}</span>
              <ChevronRight class="w-4 h-4 text-text-tertiary"/>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <Loader2 class="w-6 h-6 text-primary animate-spin"/>
        </div>

        <!-- Edit Role Panel -->
        <div v-if="selectedRole && !isCreatingRole" class="bg-bg-surface p-4 rounded-lg space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-text-default">{{ t('roles.admin.editTitle', { name: selectedRole.name }) }}</h4>
            <button class="text-text-tertiary hover:text-text-secondary" @click="selectedRole = null">
              <X class="w-5 h-5"/>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('roles.admin.roleName') }}</label>
              <input
                  v-model="editingRole!.name"
                  :disabled="selectedRole.name === '@everyone'"
                  class="input"
                  type="text"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('roles.admin.roleColor') }}</label>
              <div class="flex items-center gap-3">
                <input
                    v-model="editingRole!.color"
                    class="h-10 w-20 rounded cursor-pointer"
                    type="color"
                />
                <input
                    v-model="editingRole!.color"
                    class="input flex-1"
                    type="text"
                />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="editingRole!.isHoisted"
                    class="checkbox"
                    type="checkbox"
                />
                <span class="text-sm text-text-secondary">{{ t('roles.admin.displaySeparately') }}</span>
              </label>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="editingRole!.isMentionable"
                    class="checkbox"
                    type="checkbox"
                />
                <span class="text-sm text-text-secondary">{{ t('roles.admin.allowMention') }}</span>
              </label>
            </div>

            <!-- Permissions Section -->
            <div>
              <h5 class="font-medium text-text-default mb-3">{{ t('roles.admin.permissionsTitle') }}</h5>
              <div class="space-y-2 max-h-60 overflow-y-auto">
                <label
                    v-for="perm in availablePermissions"
                    :key="perm.value"
                    class="flex items-center gap-2 cursor-pointer hover:bg-main-700 p-2 rounded"
                >
                  <input
                      :checked="hasPermission(editingRole!.permissions, perm.value)"
                      class="checkbox"
                      type="checkbox"
                      @change="togglePermission(perm.value)"
                  />
                  <div>
                    <p class="text-sm text-text-default">{{ perm.name }}</p>
                    <p class="text-xs text-text-tertiary">{{ perm.description }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-between">
            <button
                v-if="selectedRole.name !== '@everyone'"
                class="btn btn-danger"
                @click="deleteRole"
            >
              {{ t('roles.admin.deleteRole') }}
            </button>
            <div class="flex gap-3">
              <button class="btn btn-secondary" @click="selectedRole = null">{{ t('common.cancel') }}</button>
              <button class="btn btn-primary" @click="updateRole">{{ t('common.saveChanges') }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import {ref, computed, watch, onMounted} from 'vue';
import {Plus, ChevronRight, X, Loader2} from 'lucide-vue-next';
import BaseModal from '@/components/modals/BaseModal.vue';
import {useToast} from '@/composables/useToast';
import {useAppStore} from '@/stores/app';
import roleService from '@/services/roleService';
import type {ServerListItem, Role, Permission as PermissionType} from '@/services/types';
import {Permission} from '@/services/types';
import {usePermissions} from "@/composables/usePermissions.ts";
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

const {addToast} = useToast();
const appStore = useAppStore();
const permissions = usePermissions();
const { t } = useI18n();

// State
const loading = ref(false);
const roles = ref<Role[]>([]);
const selectedRole = ref<Role | null>(null);
const editingRole = ref<Role | null>(null);
const isCreatingRole = ref(false);
const newRole = ref({
  name: '',
  color: '#7c3aed',
  permissions: Permission.None,
  isHoisted: false,
  isMentionable: false,
});

const permissionValues = Object.values(Permission)
    .filter((value) => typeof value === 'number' && value !== Permission.None) as Permission[];

const availablePermissions = permissionValues.map((p) => ({
  value: p,
  name: permissions.permissionDetails[p]?.name,
  description: permissions.permissionDetails[p]?.description,
}));

// Computed
const sortedRoles = computed(() => {
  return [...roles.value].sort((a, b) => {
    // @everyone always goes last
    if (a.name === '@everyone') return 1;
    if (b.name === '@everyone') return -1;
    // Sort by position (higher position = higher in list)
    return b.position - a.position;
  });
});

// Methods
const close = () => {
  emit('update:modelValue', false);
  emit('close');
  selectedRole.value = null;
  isCreatingRole.value = false;
  resetNewRole();
};

const fetchRoles = async () => {
  if (!props.server) return;

  loading.value = true;
  try {
    roles.value = await roleService.getRoles(props.server.id);
  } catch (error: any) {
    addToast({
      message: error.message || t('roles.admin.toast.loadFailed'),
      type: 'danger',
      title: t('common.error'),
    });
  } finally {
    loading.value = false;
  }
};

const startCreatingRole = () => {
  isCreatingRole.value = true;
  selectedRole.value = null;
};

const cancelCreatingRole = () => {
  isCreatingRole.value = false;
  resetNewRole();
};

const resetNewRole = () => {
  newRole.value = {
    name: '',
    color: '#7c3aed',
    permissions: Permission.None,
    isHoisted: false,
    isMentionable: false,
  };
};

const createRole = async () => {
  if (!props.server || !newRole.value.name) return;

  try {
    const createdRole = await roleService.createRole(props.server.id, newRole.value);
    roles.value.push(createdRole);
    isCreatingRole.value = false;
    resetNewRole();
    addToast({
      message: t('roles.admin.toast.created'),
      type: 'success',
      title: t('common.success'),
    });
  } catch (error: any) {
    addToast({
      message: error.message || t('roles.admin.toast.createFailed'),
      type: 'danger',
      title: t('common.error'),
    });
  }
};

const selectRole = (role: Role) => {
  selectedRole.value = role;
  editingRole.value = {...role};
};

const hasPermission = (permissions: PermissionType, permission: PermissionType): boolean => {
  return (permissions & permission) !== 0;
};

const togglePermission = (permission: PermissionType) => {
  if (!editingRole.value) return;

  if (permission === Permission.Administrator) {
    // If toggling Administrator, set all permissions or none
    editingRole.value.permissions = hasPermission(editingRole.value.permissions, permission)
        ? Permission.None
        : (Permission.Administrator | Permission.ViewChannels | Permission.SendMessages | Permission.ManageMessages |
            Permission.CreateInvite | Permission.ManageChannels | Permission.ManageRoles | Permission.KickMembers |
            Permission.BanMembers | Permission.ManageServer | Permission.MentionEveryone | Permission.AttachFiles |
            Permission.EmbedLinks | Permission.AddReactions | Permission.ReadMessageHistory);
  } else {
    // Toggle individual permission
    if (hasPermission(editingRole.value.permissions, permission)) {
      editingRole.value.permissions &= ~permission;
    } else {
      editingRole.value.permissions |= permission;
    }
  }
};

const updateRole = async () => {
  if (!props.server || !selectedRole.value || !editingRole.value) return;

  try {
    const updated = await roleService.updateRole(props.server.id, selectedRole.value.id, {
      name: editingRole.value.name !== selectedRole.value.name ? editingRole.value.name : undefined,
      color: editingRole.value.color !== selectedRole.value.color ? editingRole.value.color : undefined,
      permissions: editingRole.value.permissions !== selectedRole.value.permissions ? editingRole.value.permissions : undefined,
      isHoisted: editingRole.value.isHoisted !== selectedRole.value.isHoisted ? editingRole.value.isHoisted : undefined,
      isMentionable: editingRole.value.isMentionable !== selectedRole.value.isMentionable ? editingRole.value.isMentionable : undefined,
    });

    const index = roles.value.findIndex(r => r.id === selectedRole.value!.id);
    if (index !== -1) {
      roles.value[index] = updated;
    }

    selectedRole.value = null;
    editingRole.value = null;

    addToast({
      message: t('roles.admin.toast.updated'),
      type: 'success',
      title: t('common.success'),
    });
  } catch (error: any) {
    addToast({
      message: error.message || t('roles.admin.toast.updateFailed'),
      type: 'danger',
      title: t('common.error'),
    });
  }
};

const deleteRole = async () => {
  if (!props.server || !selectedRole.value) return;

  if (!confirm(t('roles.admin.confirmDelete', { name: selectedRole.value.name }))) return;

  try {
    await roleService.deleteRole(props.server.id, selectedRole.value.id);
    roles.value = roles.value.filter(r => r.id !== selectedRole.value!.id);
    selectedRole.value = null;
    editingRole.value = null;

    addToast({
      message: t('roles.admin.toast.deleted'),
      type: 'success',
      title: t('common.success'),
    });
  } catch (error: any) {
    addToast({
      message: error.message || t('roles.admin.toast.deleteFailed'),
      type: 'danger',
      title: t('common.error'),
    });
  }
};

const getMemberCount = (role: Role): number => {
  if (role.name === '@everyone') {
    return appStore.members.length;
  }
  return appStore.members.filter(m => m.roles.some(r => r.id === role.id)).length;
};

// Watchers
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.server) {
    fetchRoles();
  }
});

// Lifecycle
onMounted(() => {
  if (props.modelValue && props.server) {
    fetchRoles();
  }
});
</script>

<style scoped>
@reference "@/style.css";

.input {
  @apply w-full px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-default focus:outline-none focus:ring-2 focus:ring-primary;
}
</style>
