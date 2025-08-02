<template>
  <div class="flex h-screen w-full bg-bg-base">
    <!-- Settings Navigation Sidebar -->
    <div class="w-64 bg-bg-surface border-r border-border-default overflow-y-auto flex-shrink-0 scrollbar-thin">
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
    <div class="flex-1 min-w-0 w-full">
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
  Keyboard,
  Globe
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
import KeybindsView from './sections/KeybindsView.vue';
import LanguageView from './sections/LanguageView.vue';

const route = useRoute();
const router = useRouter();

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