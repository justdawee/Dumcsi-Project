<template>
  <div class="absolute bottom-0 left-0 w-[332px] px-2 py-2 border-r border-t border-main-700 bg-main-950">
    <div class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-main-800 transition">
      <!-- Left clickable container: avatar + display name opens quick menu -->
      <button class="flex items-center gap-2 flex-1 min-w-0 text-left" @click="openQuickMenu = true">
        <UserAvatar
            :avatar-url="authStore.user?.avatar"
            :size="32"
            :user-id="authStore.user?.id"
            :username="authStore.user?.username || ''"
            show-online-indicator
        />
        <div class="min-w-0">
          <p class="text-sm font-medium text-text-default truncate">
            {{ getDisplayName(authStore.user) }}
          </p>
          <div class="text-xs text-text-muted truncate">
            @{{ authStore.user?.username }}
          </div>
        </div>
      </button>

      <!-- Right controls remain -->
      <div class="flex items-center">
        <!-- Mic mute/unmute button -->
        <button
          @click="toggleMute"
          :class="[
            'w-8 h-8 rounded flex items-center justify-center transition-colors',
            isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-main-700 text-text-muted hover:text-text-secondary'
          ]"
          :title="isMuted ? t('user.panel.unmute') : t('user.panel.mute')"
        >
          <MicOff v-if="isMuted" class="w-4 h-4" />
          <Mic v-else class="w-4 h-4" />
        </button>
        
        <!-- Headphones mute/unmute button -->
        <button
          @click="toggleDeafen"
          :class="[
            'w-8 h-8 rounded flex items-center justify-center transition-colors',
            isDeafened ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-main-700 text-text-muted hover:text-text-secondary'
          ]"
          :title="isDeafened ? t('user.panel.undeafen') : t('user.panel.deafen')"
        >
          <VolumeX v-if="isDeafened" class="w-4 h-4" />
          <Volume2 v-else class="w-4 h-4" />
        </button>
        
        <!-- Settings button -->
        <RouterLink :title="t('user.panel.settings')" to="/settings">
          <button class="w-8 h-8 rounded flex items-center justify-center hover:bg-main-700 transition-colors">
            <Settings class="w-4 h-4 text-text-muted hover:text-text-secondary cursor-pointer"/>
          </button>
        </RouterLink>
      </div>
    </div>

    <!-- Quick menu modal -->
    <UserQuickMenu :open="openQuickMenu" @close="openQuickMenu = false" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Settings, Mic, MicOff, Volume2, VolumeX } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useUserDisplay } from '@/composables/useUserDisplay';
import UserAvatar from '@/components/common/UserAvatar.vue';
import UserQuickMenu from '@/components/common/UserQuickMenu.vue';

const authStore = useAuthStore();
const appStore = useAppStore();
const { getDisplayName } = useUserDisplay();

const openQuickMenu = ref(false);
const { t } = useI18n();

const isMuted = computed(() => appStore.selfMuted);
const isDeafened = computed(() => appStore.selfDeafened);

const toggleMute = () => {
  appStore.toggleSelfMute();
};

const toggleDeafen = () => {
  appStore.toggleSelfDeafen();
};
</script>
