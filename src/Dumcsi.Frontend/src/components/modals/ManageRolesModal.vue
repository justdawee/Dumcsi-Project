<template>
  <BaseModal :show="modelValue" @close="close">
    <template #title>Manage Roles</template>
    <template #default>
      <div class="space-y-6">
        <!-- Create New Role Section -->
        <div v-if="!isCreatingRole" class="flex justify-between items-center">
          <h3 class="text-lg font-semibold text-text-default">Server Roles</h3>
          <button
              @click="startCreatingRole"
              class="btn btn-primary"
          >
            <Plus class="w-4 h-4 mr-2" />
            Create Role
          </button>
        </div>

        <!-- New Role Creation Form -->
        <div v-if="isCreatingRole" class="bg-bg-surface p-4 rounded-lg space-y-4">
          <h4 class="font-semibold text-text-default">Create New Role</h4>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Role Name</label>
              <input
                  v-model="newRole.name"
                  type="text"
                  class="input"
                  placeholder="Enter role name"
                  @keyup.enter="createRole"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Role Color</label>
              <div class="flex items-center gap-3">
                <input
                    v-model="newRole.color"
                    type="color"
                    class="h-10 w-20 rounded cursor-pointer"
                />
                <input
                    v-model="newRole.color"
                    type="text"
                    class="input flex-1"
                    placeholder="#ffffff"
                />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="newRole.isHoisted"
                    type="checkbox"
                    class="checkbox"
                />
                <span class="text-sm text-text-secondary">Display separately in member list</span>
              </label>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="newRole.isMentionable"
                    type="checkbox"
                    class="checkbox"
                />
                <span class="text-sm text-text-secondary">Allow anyone to @mention this role</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button @click="cancelCreatingRole" class="btn btn-secondary">Cancel</button>
            <button @click="createRole" :disabled="!newRole.name" class="btn btn-primary">Create</button>
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
                  class="w-4 h-4 rounded-full"
                  :style="{ backgroundColor: role.color }"
              ></div>
              <span class="font-medium text-text-default">{{ role.name }}</span>
              <span v-if="role.name === '@everyone'" class="text-xs text-text-tertiary">(default)</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-text-secondary">{{ getMemberCount(role) }} members</span>
              <ChevronRight class="w-4 h-4 text-text-tertiary" />
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <Loader2 class="w-6 h-6 text-primary animate-spin" />
        </div>

        <!-- Edit Role Panel -->
        <div v-if="selectedRole && !isCreatingRole" class="bg-bg-surface p-4 rounded-lg space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-text-default">Edit Role: {{ selectedRole.name }}</h4>
            <button @click="selectedRole = null" class="text-text-tertiary hover:text-text-secondary">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Role Name</label>
              <input
                  v-model="editingRole.name"
                  type="text"
                  class="input"
                  :disabled="selectedRole.name === '@everyone' || selectedRole.name === 'Admin'"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Role Color</label>
              <div class="flex items-center gap-3">
                <input
                    v-model="editingRole.color"
                    type="color"
                    class="h-10 w-20 rounded cursor-pointer"
                />
                <input
                    v-model="editingRole.color"
                    type="text"
                    class="input flex-1"
                />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="editingRole.isHoisted"
                    type="checkbox"
                    class="checkbox"
                />
                <span class="text-sm text-text-secondary">Display separately in member list</span>
              </label>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                    v-model="editingRole.isMentionable"
                    type="checkbox"
                    class="checkbox"
                />
                <span class="text-sm text-text-secondary">Allow anyone to @mention this role</span>
              </label>
            </div>

            <!-- Permissions Section -->
            <div>
              <h5 class="font-medium text-text-default mb-3">Permissions</h5>
              <div class="space-y-2 max-h-60 overflow-y-auto">
                <label
                    v-for="perm in availablePermissions"
                    :key="perm.value"
                    class="flex items-center gap-2 cursor-pointer hover:bg-main-700 p-2 rounded"
                >
                  <input
                      type="checkbox"
                      :checked="hasPermission(editingRole.permissions, perm.value)"
                      @change="togglePermission(perm.value)"
                      class="checkbox"
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
                v-if="selectedRole.name !== '@everyone' && selectedRole.name !== 'Admin'"
                @click="deleteRole"
                class="btn btn-danger"
            >
              Delete Role
            </button>
            <div class="flex gap-3">
              <button @click="selectedRole = null" class="btn btn-secondary">Cancel</button>
              <button @click="updateRole" class="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Plus, ChevronRight, X, Loader2 } from 'lucide-vue-next';
import BaseModal from '@/components/modals/BaseModal.vue';
import { useToast } from '@/composables/useToast';
import { useAppStore } from '@/stores/app';
import roleService from '@/services/roleService';
import type { ServerListItem, Role, Permission as PermissionType } from '@/services/types';
import { Permission } from '@/services/types';

const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

const { addToast } = useToast();
const appStore = useAppStore();

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

// Available permissions for the UI
const availablePermissions = [
  { value: Permission.ViewChannels, name: 'View Channels', description: 'Allows members to view and connect to channels' },
  { value: Permission.SendMessages, name: 'Send Messages', description: 'Allows members to send messages in text channels' },
  { value: Permission.ManageMessages, name: 'Manage Messages', description: 'Allows members to delete messages from other members' },
  { value: Permission.CreateInvite, name: 'Create Invite', description: 'Allows members to invite new people to the server' },
  { value: Permission.ManageChannels, name: 'Manage Channels', description: 'Allows members to create, edit, and delete channels' },
  { value: Permission.ManageRoles, name: 'Manage Roles', description: 'Allows members to create, edit, and delete roles' },
  { value: Permission.KickMembers, name: 'Kick Members', description: 'Allows members to remove other members from the server' },
  { value: Permission.BanMembers, name: 'Ban Members', description: 'Allows members to permanently ban other members' },
  { value: Permission.ManageServer, name: 'Manage Server', description: 'Allows members to change server name, icon, and other settings' },
  { value: Permission.Administrator, name: 'Administrator', description: 'Gives all permissions and bypasses channel-specific permissions' },
  { value: Permission.MentionEveryone, name: 'Mention @everyone', description: 'Allows members to use @everyone and @here mentions' },
  { value: Permission.AttachFiles, name: 'Attach Files', description: 'Allows members to upload files and images' },
  { value: Permission.EmbedLinks, name: 'Embed Links', description: 'Links sent by members will automatically embed' },
  { value: Permission.AddReactions, name: 'Add Reactions', description: 'Allows members to add reactions to messages' },
  { value: Permission.ReadMessageHistory, name: 'Read Message History', description: 'Allows members to read previous messages' },
];

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
      message: error.message || 'Failed to load roles',
      type: 'danger',
      title: 'Error',
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
      message: 'Role created successfully',
      type: 'success',
      title: 'Success',
    });
  } catch (error: any) {
    addToast({
      message: error.message || 'Failed to create role',
      type: 'danger',
      title: 'Error',
    });
  }
};

const selectRole = (role: Role) => {
  selectedRole.value = role;
  editingRole.value = { ...role };
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
      message: 'Role updated successfully',
      type: 'success',
      title: 'Success',
    });
  } catch (error: any) {
    addToast({
      message: error.message || 'Failed to update role',
      type: 'danger',
      title: 'Error',
    });
  }
};

const deleteRole = async () => {
  if (!props.server || !selectedRole.value) return;

  if (!confirm(`Are you sure you want to delete the role "${selectedRole.value.name}"?`)) return;

  try {
    await roleService.deleteRole(props.server.id, selectedRole.value.id);
    roles.value = roles.value.filter(r => r.id !== selectedRole.value!.id);
    selectedRole.value = null;
    editingRole.value = null;

    addToast({
      message: 'Role deleted successfully',
      type: 'success',
      title: 'Success',
    });
  } catch (error: any) {
    addToast({
      message: error.message || 'Failed to delete role',
      type: 'danger',
      title: 'Error',
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

.checkbox {
  @apply w-4 h-4 text-primary bg-bg-surface border-border-default rounded focus:ring-primary focus:ring-2;
}

.input {
  @apply w-full px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-default focus:outline-none focus:ring-2 focus:ring-primary;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-base;
}

.btn-primary {
  @apply bg-primary text-white hover:bg-primary-hover focus:ring-primary;
}

.btn-secondary {
  @apply bg-main-700 text-text-secondary hover:bg-main-600 focus:ring-main-600;
}

.btn-danger {
  @apply bg-danger text-white hover:bg-red-700 focus:ring-danger;
}
</style>