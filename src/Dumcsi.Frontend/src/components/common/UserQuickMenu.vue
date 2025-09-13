<template>
  <div v-if="open" class="fixed inset-0 z-[200]" @click.self="close">
    <div class="absolute bottom-18 left-4 w-[280px] bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-visible">
      <!-- Header -->
      <div class="p-4 flex items-center gap-3 border-b border-border-default bg-bg-base/60">
        <UserAvatar :user="auth.user" :size="48" :show-online-indicator="true" />
        <div class="min-w-0">
          <div class="text-base font-semibold truncate text-text-default">{{ displayName }}</div>
          <div class="text-xs text-text-muted truncate">@{{ auth.user?.username }}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="p-2">
        <!-- Section: Edit profile + Status (stacked) -->
        <div class="mb-2 rounded-md border border-main-700 bg-main-900/40 p-2 flex flex-col gap-2">
          <button class="w-full px-3 py-2 rounded-md bg-main-800 hover:bg-main-700 text-sm text-text-default border border-main-700 text-left flex items-center gap-2 justify-start"
                  @click="goEditProfile">
            <Pencil class="w-4 h-4" />
            <span>{{ t('account.menu.editProfile') }}</span>
          </button>
          <div class="relative"
               @mouseenter="openStatusMenu"
               @mouseleave="scheduleCloseStatusMenu">
            <button class="w-full px-3 py-2 rounded-md bg-main-800 hover:bg-main-700 text-sm text-text-default border border-main-700 flex items-center justify-between">
              <span class="flex items-center gap-2">
                <span :class="['inline-block w-2.5 h-2.5 rounded-full', currentDot]" />
                {{ statusLabel }}
              </span>
              <ChevronDown class="w-4 h-4 text-text-muted" />
            </button>

            <!-- Status menu -->
            <Transition name="menu-fade">
              <div v-if="statusMenuOpen" ref="statusMenuRef" class="absolute z-10 mt-1 w-56 bg-bg-surface border border-border-default rounded-md shadow-lg"
                   @mouseenter="openStatusMenu" @mouseleave="scheduleCloseStatusMenu">
                <div class="py-1">
                  <button v-for="opt in statusOptions" :key="opt.value" class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-main-700 text-text-default"
                          @mouseenter="opt.value !== UserStatus.Online ? hoveredTimed = opt.value : hoveredTimed = null"
                          @click="selectStatus(opt.value)">
                    <span class="flex items-center gap-2">
                      <span :class="['inline-block w-2.5 h-2.5 rounded-full', opt.dot]" />
                      {{ opt.label }}
                    </span>
                    <ChevronRight v-if="opt.value !== UserStatus.Online" class="w-4 h-4 text-text-muted" />
                  </button>
                </div>

                <!-- Duration submenu (only for Idle, DND, Invisible) -->
                <Transition name="menu-fade">
                  <div v-if="hoveredTimed" :class="['absolute top-0 w-44 bg-bg-surface border border-border-default rounded-md shadow-lg', submenuOnLeft ? 'right-full mr-1' : 'left-full ml-1']"
                       @mouseenter="openStatusMenu" @mouseleave="scheduleCloseStatusMenu">
                    <div class="py-1">
                      <button v-for="d in durations" :key="d.label" class="w-full text-left px-3 py-2 text-sm hover:bg-main-700 text-text-default"
                              @click="selectTimed(hoveredTimed, d.ms)">{{ d.label }}</button>
                    </div>
                  </div>
                </Transition>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Separator -->
        <div class="h-px bg-border-default my-2"></div>

        <!-- Section: Account actions -->
        <div class="rounded-md border border-main-700 bg-main-900/40 p-2 flex flex-col gap-2">
          <button class="w-full px-3 py-2 rounded-md bg-main-800 hover:bg-main-700 text-sm text-text-default border border-main-700 text-left flex items-center gap-2 justify-start"
                  @click="switchAccounts">
            <CircleUser class="w-4 h-4" />
            <span>{{ t('account.menu.switchAccounts') }}</span>
          </button>
          <button class="w-full px-3 py-2 rounded-md bg-danger/10 hover:bg-danger/20 text-sm text-danger border border-danger/30 text-left flex items-center gap-2 justify-start"
                  @click="signOut">
            <LogOut class="w-4 h-4" />
            <span>{{ t('account.menu.signOut') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronDown, ChevronRight, Pencil, LogOut, CircleUser } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { UserStatus } from '@/services/types';
import { signalRService } from '@/services/signalrService';
import { useRouter } from 'vue-router';
import UserAvatar from '@/components/common/UserAvatar.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['close']);

const auth = useAuthStore();
const app = useAppStore();
const router = useRouter();
const { getDisplayName } = useUserDisplay();

const open = computed(() => props.open);
const displayName = computed(() => getDisplayName(auth.user));
const { t } = useI18n();

const statusMenuOpen = ref(false);
let statusMenuHideTimer: number | null = null;
const hoveredTimed = ref<UserStatus | null>(null);
const statusMenuRef = ref<HTMLElement | null>(null);
const submenuOnLeft = ref(false);

const statusOptions = [
  { value: UserStatus.Online, label: t('account.menu.statusLabel.online'), dot: 'bg-[#23a55a]' },
  { value: UserStatus.Idle, label: t('account.menu.statusLabel.idle'), dot: 'bg-[#f0b232]' },
  { value: UserStatus.Busy, label: t('account.menu.statusLabel.dnd'), dot: 'bg-[#f23f43]' },
  { value: UserStatus.Invisible, label: t('account.menu.statusLabel.invisible'), dot: 'bg-[#80848e]' },
] as const;

const durations = [
  { label: t('account.menu.duration.m15'), ms: 15 * 60 * 1000 },
  { label: t('account.menu.duration.h1'), ms: 60 * 60 * 1000 },
  { label: t('account.menu.duration.h8'), ms: 8 * 60 * 60 * 1000 },
  { label: t('account.menu.duration.h24'), ms: 24 * 60 * 60 * 1000 },
  { label: t('account.menu.duration.d3'), ms: 3 * 24 * 60 * 60 * 1000 },
  { label: t('account.menu.duration.forever'), ms: 0 },
];

const currentStatus = computed<UserStatus>(() => {
  const uid = auth.user?.id;
  const self = uid ? app.members.find(m => m.userId === uid) : null;
  return (self?.status || UserStatus.Online) as UserStatus;
});

const statusLabel = computed(() => {
  const s = statusOptions.find(s => s.value === currentStatus.value);
  return s ? s.label : t('account.menu.status');
});

const statusDotMap: Record<UserStatus, string> = {
  [UserStatus.Online]: 'bg-[#23a55a]',
  [UserStatus.Idle]: 'bg-[#f0b232]',
  [UserStatus.Busy]: 'bg-[#f23f43]',
  [UserStatus.Invisible]: 'bg-[#80848e]',
  [UserStatus.Offline]: 'bg-[#80848e]',
};

const currentDot = computed(() => statusDotMap[currentStatus.value] || 'bg-[#80848e]');

const goEditProfile = async () => {
  await router.push('/settings/profile');
  close();
};

const openStatusMenu = () => {
  if (statusMenuHideTimer) { clearTimeout(statusMenuHideTimer); statusMenuHideTimer = null; }
  statusMenuOpen.value = true;
};

const scheduleCloseStatusMenu = () => {
  if (statusMenuHideTimer) clearTimeout(statusMenuHideTimer);
  statusMenuHideTimer = setTimeout(() => {
    statusMenuOpen.value = false;
    hoveredTimed.value = null;
    statusMenuHideTimer = null;
  }, 160) as unknown as number;
};

const selectStatus = (status: UserStatus) => {
  if (status === UserStatus.Online) {
    signalRService.setPreferredStatus(null);
    signalRService.setUserStatus(UserStatus.Online);
    close();
  } else {
    // Default to Forever if clicked (no duration picked)
    signalRService.setPreferredStatus(status);
    close();
  }
};

const selectTimed = (status: UserStatus, ms: number) => {
  if (ms > 0) {
    signalRService.setPreferredStatusTimed(status, ms);
  } else {
    // Forever
    signalRService.setPreferredStatus(status);
  }
  close();
};

const signOut = async () => {
  await useAuthStore().logout();
  close();
};

const switchAccounts = async () => {
  console.log("Not implemented yet.")
};

const close = () => emit('close');

watch(open, (v) => {
  if (!v) { statusMenuOpen.value = false; hoveredTimed.value = null; }
});

// Recalculate submenu placement when opening or when a timed status is hovered
watch([statusMenuOpen, hoveredTimed], async ([openVal, timed]) => {
  if (openVal && timed) {
    await nextTick();
    const rect = statusMenuRef.value?.getBoundingClientRect();
    if (rect) {
      const submenuWidth = 176 + 8; // w-44 + margin
      submenuOnLeft.value = rect.right + submenuWidth > window.innerWidth - 8;
    }
  }
});

// Optional: update on resize for robustness
const onResize = () => {
  if (statusMenuOpen.value && hoveredTimed.value) {
    const rect = statusMenuRef.value?.getBoundingClientRect();
    if (rect) {
      const submenuWidth = 176 + 8;
      submenuOnLeft.value = rect.right + submenuWidth > window.innerWidth - 8;
    }
  }
};

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));
</script>

<style scoped>
@reference "@/style.css";
/* Panel entrance */
.menu-fade-enter-active, .menu-fade-leave-active {
  transition: opacity 120ms ease, transform 140ms ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(2px) scale(0.98);
}
.menu-fade-enter-to,
.menu-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
