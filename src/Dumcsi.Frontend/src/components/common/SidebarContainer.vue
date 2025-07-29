<template>
  <div class="w-60 bg-main-950 flex flex-col h-full overflow-hidden">
    <!-- Header Section -->
    <div class="px-4 h-14 border-b border-l border-r border-border-default shadow-xs flex-shrink-0 flex items-center">
      <slot name="header" />
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto border-l border-r border-border-default shadow-xs scrollbar-thin min-h-0">
      <slot name="content" />
    </div>

    <!-- User Info Section -->
    <div class="px-2 py-2 bg-main-950 border-t border-l border-r border-border-default">
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-main-800 transition">
        <UserAvatar
            :avatar-url="authStore.user?.avatar"
            :size="32"
            :user-id="authStore.user?.id"
            :username="authStore.user?.username || ''"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-default truncate">
            {{ getDisplayName(authStore.user) }}
          </p>
          <div class="text-xs text-text-muted truncate">
            @{{ authStore.user?.username }}
          </div>
        </div>
        <RouterLink title="Felhasználói beállítások" to="/settings/profile">
          <Settings class="w-4 h-4 text-text-muted hover:text-text-secondary cursor-pointer"/>
        </RouterLink>
      </div>
    </div>

    <!-- Optional Footer Slot -->
    <slot name="footer" />
  </div>
</template>

<script lang="ts" setup>
import { Settings } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useUserDisplay } from '@/composables/useUserDisplay';
import UserAvatar from '@/components/common/UserAvatar.vue';

const authStore = useAuthStore();
const { getDisplayName } = useUserDisplay();
</script>