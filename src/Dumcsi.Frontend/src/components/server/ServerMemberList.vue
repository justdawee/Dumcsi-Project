<template>
  <div class="w-60 bg-[var(--bg-secondary)] flex flex-col">
    <!-- Search bar -->
    <div class="p-3">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search members"
          class="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        />
      </div>
    </div>

    <!-- Member list -->
    <div class="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
      <div v-for="role in membersByRole" :key="role.name" class="mb-4">
        <h3 class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide px-2 mb-2">
          {{ role.name }} — {{ role.members.length }}
        </h3>
        
        <div class="space-y-0.5">
          <button
            v-for="member in role.members"
            :key="member.userId"
            @click="openUserProfile(member)"
            class="w-full px-2 py-1.5 rounded-lg flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors group"
          >
            <UserAvatar :user="member.user" :size="32" />
            
            <div class="flex-1 text-left min-w-0">
              <p class="text-sm font-medium text-[var(--text-primary)] truncate">
                {{ member.nickname || member.user.username }}
                <span v-if="member.userId === appStore.currentServer?.ownerId" class="text-[var(--accent-secondary)] ml-1">
                  <Crown class="w-3 h-3 inline" />
                </span>
              </p>
              <p v-if="member.user.status" class="text-xs text-[var(--text-secondary)] truncate">
                {{ member.user.status }}
              </p>
            </div>

            <!-- Role color indicator -->
            <div
              v-if="role.color"
              class="w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              :style="{ backgroundColor: role.color }"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Crown } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import UserAvatar from '@/components/common/UserAvatar.vue'
import type { ServerMember } from '@/types'

const appStore = useAppStore()
const searchQuery = ref('')

const filteredMembers = computed(() => {
  if (!appStore.currentServer) return []
  
  const query = searchQuery.value.toLowerCase()
  if (!query) return appStore.currentServer.members

  return appStore.currentServer.members.filter(member => {
    const username = member.user.username.toLowerCase()
    const nickname = member.nickname?.toLowerCase() || ''
    return username.includes(query) || nickname.includes(query)
  })
})

const membersByRole = computed(() => {
  if (!appStore.currentServer) return []

  // Group members by role
  const roleGroups = new Map<string, { name: string; color?: string; members: ServerMember[] }>()

  // Define role hierarchy
  const roleOrder = ['Owner', 'Admin', 'Moderator', 'Member']
  const roleColors = {
    Owner: '#ffcf56',
    Admin: '#8e79ff',
    Moderator: '#56b8ff',
    Member: undefined
  }

  // Initialize role groups
  roleOrder.forEach(roleName => {
    if (filteredMembers.value.some(m => m.role === roleName)) {
      roleGroups.set(roleName, {
        name: roleName === 'Member' ? 'Members' : roleName + 's',
        color: roleColors[roleName as keyof typeof roleColors],
        members: []
      })
    }
  })

  // Sort members into role groups
  filteredMembers.value.forEach(member => {
    const group = roleGroups.get(member.role)
    if (group) {
      group.members.push(member)
    }
  })

  // Sort members within each role by online status and name
  roleGroups.forEach(group => {
    group.members.sort((a, b) => {
      // Online users first
      if (a.user.isOnline !== b.user.isOnline) {
        return a.user.isOnline ? -1 : 1
      }
      // Then alphabetically
      return (a.nickname || a.user.username).localeCompare(b.nickname || b.user.username)
    })
  })

  return Array.from(roleGroups.values())
})

function openUserProfile(member: ServerMember) {
  // TODO: Implement user profile modal
  console.log('Open profile for:', member.user.username)
}
</script>