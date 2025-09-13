<template>
  <div class="h-screen w-full bg-bg-base flex justify-center">
    <!-- Centered Settings Wrapper -->
    <div class="w-full h-full max-w-6xl px-4 sm:px-6 lg:px-8 flex gap-6 items-stretch relative">
      <!-- Settings Navigation Sidebar -->
      <div class="w-64 bg-bg-surface border-l border-r border-border-default overflow-y-auto flex-shrink-0 scrollbar-thin">
        <div class="p-6">
        <div class="flex items-center space-x-3 mb-8">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-primary/20 rounded-lg">
            <Settings class="w-5 h-5 text-primary"/>
          </div>
          <h1 class="text-xl font-bold">Settings</h1>
        </div>

        <!-- User Settings Section -->
        <div class="mb-6">
          <h2 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 px-2">User Settings</h2>
          <nav class="space-y-1">
            <router-link
              v-for="item in userSettings"
              :key="item.key"
              :to="{ name: 'Settings', params: { section: item.key } }"
              :class="[
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                currentSection === item.key
                  ? 'bg-primary text-primary-text'
                  : 'text-text-default hover:bg-bg-hover hover:text-text-default'
              ]"
            >
              <component :is="item.icon" class="w-4 h-4 mr-3 flex-shrink-0" />
              {{ item.label }}
            </router-link>
          </nav>
        </div>

        <!-- App Settings Section -->
        <div>
          <h2 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 px-2">App Settings</h2>
          <nav class="space-y-1">
            <router-link
              v-for="item in appSettings"
              :key="item.key"
              :to="{ name: 'Settings', params: { section: item.key } }"
              :class="[
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                currentSection === item.key
                  ? 'bg-primary text-primary-text'
                  : 'text-text-default hover:bg-bg-hover hover:text-text-default'
              ]"
            >
              <component :is="item.icon" class="w-4 h-4 mr-3 flex-shrink-0" />
              {{ item.label }}
            </router-link>
          </nav>
        </div>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
        <component :is="currentComponent" />
      </div>

      <!-- Close button styled like the screenshot -->
      <div class="absolute top-4 -right-10 z-50">
        <div class="flex flex-col items-center gap-1 text-zinc-400">
          <button
              title="Close Settings"
              @click="closeSettings"
              class="group grid place-items-center w-12 h-12 rounded-full border-2 border-zinc-500/60
             bg-transparent hover:bg-white/5 transition-colors
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <!-- Icon -->
            <X class="w-4 h-4 text-zinc-200 group-hover:text-white stroke-[2]" />
          </button>

          <!-- Label under the circle (no parentheses) -->
          <span class="text-xs tracking-wide select-none">ESC</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCloseSettings } from '@/composables/useCloseSettings';
import {
  Settings,
  User,
  UserCircle,
  Shield,
  Database,
  Smartphone,
  Palette,
  Mic,
  MessageSquare,
  Bell,
  Volume2,
  Keyboard,
  Globe,
  X
} from 'lucide-vue-next';

// Settings Components (lazy loaded)
import MyAccountView from './sections/MyAccountView.vue';
import ProfileView from './sections/ProfileView.vue';
import ContentSocialView from './sections/ContentSocialView.vue';
import DataPrivacyView from './sections/DataPrivacyView.vue';
import DevicesView from './sections/DevicesView.vue';
import AppearanceView from './sections/AppearanceView.vue';
import VoiceVideoView from './sections/VoiceVideoView.vue';
import ChatView from './sections/ChatView.vue';
import NotificationsView from './sections/NotificationsView.vue';
import SoundsView from './sections/SoundsView.vue';
import KeybindsView from './sections/KeybindsView.vue';
import LanguageView from './sections/LanguageView.vue';

const route = useRoute();
const router = useRouter();
const { closeSettings } = useCloseSettings();

// ESC to close settings
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSettings();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const userSettings = [
  { key: 'my-account', label: 'My Account', icon: User, component: MyAccountView },
  { key: 'profile', label: 'Profile', icon: UserCircle, component: ProfileView },
  { key: 'content-social', label: 'Content & Social', icon: Shield, component: ContentSocialView },
  { key: 'data-privacy', label: 'Data & Privacy', icon: Database, component: DataPrivacyView },
  { key: 'devices', label: 'Devices', icon: Smartphone, component: DevicesView },
];

const appSettings = [
  { key: 'appearance', label: 'Appearance', icon: Palette, component: AppearanceView },
  { key: 'voice-video', label: 'Voice & Video', icon: Mic, component: VoiceVideoView },
  { key: 'chat', label: 'Chat', icon: MessageSquare, component: ChatView },
  { key: 'notifications', label: 'Notifications', icon: Bell, component: NotificationsView },
  { key: 'sounds', label: 'UI Sounds', icon: Volume2, component: SoundsView },
  { key: 'keybinds', label: 'Keybinds', icon: Keyboard, component: KeybindsView },
  { key: 'language', label: 'Language', icon: Globe, component: LanguageView },
];

const allSettings = [...userSettings, ...appSettings];

const currentSection = computed(() => {
  const section = route.params.section as string;
  if (!section) {
    // Redirect to profile if no section specified
    router.replace({ name: 'Settings', params: { section: 'profile' } });
    return 'profile';
  }
  return section;
});

const currentComponent = computed(() => {
  const setting = allSettings.find(s => s.key === currentSection.value);
  return setting?.component || ProfileView;
});
</script>
