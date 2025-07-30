<template>
  <BaseModal v-model="visible" title="Manage Roles" @close="$emit('update:modelValue', false)">
    <div class="space-y-4">
      <!-- Search Field -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search roles..."
          class="w-full px-3 py-2 bg-main-800 border border-main-600 rounded-md text-text-default placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <Search class="absolute right-3 top-2.5 w-4 h-4 text-text-muted" />
      </div>

      <!-- Roles List -->
      <div class="max-h-80 overflow-y-auto space-y-2">
        <!-- Loading state -->
        <div v-if="loadingRoles" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span class="ml-2 text-text-muted">Loading roles...</span>
        </div>
        
        <!-- Roles -->
        <div
          v-else
          v-for="role in filteredRoles"
          :key="role.id"
          class="flex items-center gap-3 p-2 rounded-md hover:bg-main-700/50 cursor-pointer transition-colors"
          @click="toggleRole(role)"
        >
          <!-- Role Color Dot -->
          <div class="relative">
            <div
              :style="{ backgroundColor: role.color || 'rgb(185 185 185)' }"
              :class="[
                'w-4 h-4 rounded-full border-2 border-main-600',
                hasRole(role.id) ? 'ring-2 ring-primary/50' : ''
              ]"
            >
              <!-- Filled dot indicator -->
              <div
                v-if="hasRole(role.id)"
                :style="{ backgroundColor: role.color || 'rgb(185 185 185)' }"
                class="absolute inset-1 rounded-full"
              />
            </div>
          </div>

          <!-- Role Name -->
          <span class="flex-1 text-text-default">{{ role.name }}</span>

          <!-- Role Status -->
          <div class="text-xs text-text-muted">
            {{ hasRole(role.id) ? 'Assigned' : 'Not assigned' }}
          </div>
        </div>

        <!-- No roles found -->
        <div v-if="!loadingRoles && filteredRoles.length === 0" class="text-center py-8 text-text-muted">
          <p v-if="!searchQuery.trim()">No roles available on this server</p>
          <p v-else>No roles found matching "{{ searchQuery }}"</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          class="px-4 py-2 text-text-muted hover:text-text-default transition-colors"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-md transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="saveChanges"
        >
          {{ loading ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import BaseModal from '@/components/modals/BaseModal.vue';
import { useAppStore } from '@/stores/app';
import roleService from '@/services/roleService';
import { useToast } from '@/composables/useToast';
import type { EntityId, ServerMember, Role } from '@/services/types';

interface Props {
  modelValue: boolean;
  user: ServerMember;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue']);

const appStore = useAppStore();
const { addToast } = useToast();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const searchQuery = ref('');
const loading = ref(false);
const loadingRoles = ref(false);
const selectedRoleIds = ref<Set<EntityId>>(new Set());
const fetchedRoles = ref<Role[]>([]);

// Initialize selected roles when modal opens and fetch roles if needed
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    selectedRoleIds.value = new Set(props.user.roles.map(r => r.id));
    
    // If server roles are not available, try to fetch them
    const serverRoles = appStore.currentServer?.roles || [];
    if (serverRoles.length === 0 && appStore.currentServer?.id) {
      loadingRoles.value = true;
      try {
        const roles = await roleService.getRoles(appStore.currentServer.id);
        fetchedRoles.value = roles;
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        addToast({
          type: 'danger',
          message: 'Failed to load server roles'
        });
      } finally {
        loadingRoles.value = false;
      }
    }
  }
});

// Get all available roles (excluding @everyone)
const availableRoles = computed(() => {
  const serverRoles = appStore.currentServer?.roles || [];
  
  // Priority 1: Use server roles from appStore if available
  if (serverRoles.length > 0) {
    console.log('ManageUserRolesModal: Using server roles from appStore:', serverRoles.length);
    return serverRoles.filter(role => role.name !== '@everyone');
  }
  
  // Priority 2: Use fetched roles if available
  if (fetchedRoles.value.length > 0) {
    console.log('ManageUserRolesModal: Using fetched roles:', fetchedRoles.value.length);
    return fetchedRoles.value.filter(role => role.name !== '@everyone');
  }
  
  // Priority 3: Extract roles from all members as fallback
  if (appStore.members.length > 0) {
    console.log('ManageUserRolesModal: Extracting roles from members');
    const allMemberRoles = new Map();
    appStore.members.forEach(member => {
      member.roles.forEach(role => {
        if (role.name !== '@everyone') {
          allMemberRoles.set(role.id, role);
        }
      });
    });
    const rolesFromMembers = Array.from(allMemberRoles.values());
    console.log('ManageUserRolesModal: Found roles from members:', rolesFromMembers.length);
    return rolesFromMembers;
  }
  
  console.log('ManageUserRolesModal: No roles found anywhere');
  return [];
});

// Filter roles based on search query
const filteredRoles = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableRoles.value;
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  return availableRoles.value.filter(role =>
    role.name.toLowerCase().includes(query)
  );
});

// Check if user has a specific role
const hasRole = (roleId: EntityId): boolean => {
  return selectedRoleIds.value.has(roleId);
};

// Toggle role assignment
const toggleRole = (role: Role) => {
  // Prevent toggling the @everyone role if user somehow has it
  if (role.name === '@everyone') {
    return;
  }
  
  const newSelectedRoles = new Set(selectedRoleIds.value);
  
  if (newSelectedRoles.has(role.id)) {
    newSelectedRoles.delete(role.id);
  } else {
    newSelectedRoles.add(role.id);
  }
  
  selectedRoleIds.value = newSelectedRoles;
};

// Save role changes
const saveChanges = async () => {
  const serverId = appStore.currentServer?.id;
  if (!serverId) return;

  loading.value = true;
  
  try {
    const roleIds = Array.from(selectedRoleIds.value);
    await roleService.updateMemberRoles(serverId, props.user.userId, roleIds);
    
    addToast({
      type: 'success',
      message: `Updated roles for ${props.user.username}`
    });
    
    emit('update:modelValue', false);
  } catch (error: any) {
    addToast({
      type: 'danger',
      message: error.message || 'Failed to update roles'
    });
  } finally {
    loading.value = false;
  }
};
</script>