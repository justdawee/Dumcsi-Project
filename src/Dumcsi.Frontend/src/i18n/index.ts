import { createI18n } from 'vue-i18n';
import enCommon from '@/locales/en/common.json';
import enSettings from '@/locales/en/settings.json';
import enChannels from '@/locales/en/channels.json';
import enTopics from '@/locales/en/topics.json';
import enServer from '@/locales/en/server.json';
import enChat from '@/locales/en/chat.json';
import enHome from '@/locales/en/home.json';
import enRoles from '@/locales/en/roles.json';
import enAccount from '@/locales/en/account.json';
import enMembers from '@/locales/en/members.json';
import enUser from '@/locales/en/user.json';
import enDm from '@/locales/en/dm.json';
import enFriends from '@/locales/en/friends.json';
import enVoice from '@/locales/en/voice.json';
import enAuth from '@/locales/en/auth.json';

// Default locale detection (persisted)
const STORAGE_KEY = 'dumcsi:locale';
function getInitialLocale(): string {
  try { return localStorage.getItem(STORAGE_KEY) || 'en-US'; } catch { return 'en-US'; }
}

// Assemble messages from JSON modules
const messages = {
  'en-US': {
    ...enCommon,
    settings: enSettings,
    channels: enChannels,
    topics: enTopics,
    server: enServer,
    chat: enChat,
    home: enHome,
    roles: enRoles,
    account: enAccount,
    members: enMembers,
    user: enUser,
    dm: enDm,
    friends: enFriends,
    voice: enVoice,
    auth: enAuth,
  },
} as const;

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en-US',
  messages,
});

export function setLocale(locale: string) {
  try { localStorage.setItem(STORAGE_KEY, locale); } catch {}
  // @ts-expect-error vue-i18n typing for global locale as Ref in composition mode
  i18n.global.locale.value = locale;
}
