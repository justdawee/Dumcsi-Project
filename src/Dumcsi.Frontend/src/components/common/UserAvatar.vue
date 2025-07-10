<template>
  <div
      :class="[
      'relative flex-shrink-0 flex items-center justify-center bg-gray-700 text-white font-semibold overflow-hidden',
      className
    ]"
      :style="[
        dynamicStyles,
        { backgroundColor: !avatarUrl && user ? getUserColor(userId) : undefined }
    ]"
  >
    <img
        v-if="avatarUrl && !imageError"
        :src="avatarUrl"
        :alt="displayName"
        class="w-full h-full object-cover"
        @error="handleImageError"
    />
    <span v-else :style="{ fontSize: textSize }">
      {{ initials }}
    </span>

    <!-- Online indicator -->
    <div
        v-if="showOnlineIndicator && isOnline"
        class="absolute bg-green-500 rounded-full"
        :style="onlineIndicatorStyles"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { useAppStore } from '@/stores/app';
import type { UserProfileDto, ServerMemberDto } from '@/services/types';

// Props
const props = withDefaults(defineProps<{
  user?: UserProfileDto | ServerMemberDto | null;
  avatarUrl?: string | null;
  username?: string;
  userId?: number;
  size?: number | string;
  showOnlineIndicator?: boolean;
  className?: string;
}>(), {
  size: 40,
  showOnlineIndicator: false,
  className: 'rounded-full'
});

const parsedSize = computed(() => {
  if (typeof props.size === 'string') {
    const sizeMap: Record<string, number> = {
      'xs': 24, 'sm': 32, 'md': 40, 'lg': 48, 'xl': 56, '2xl': 64, '3xl': 80, '4xl': 128
    };
    return sizeMap[props.size] || 40;
  }
  return props.size;
});

const dynamicStyles = computed(() => ({
  width: `${parsedSize.value}px`,
  height: `${parsedSize.value}px`,
}));

const textSize = computed(() => {
  // A betűméret arányos az avatar méretével
  return `${Math.max(12, parsedSize.value / 2.5)}px`;
});

const onlineIndicatorStyles = computed(() => {
  const indicatorSize = Math.max(8, parsedSize.value / 4.5);
  const borderSize = Math.max(2, indicatorSize / 4);
  const offset = indicatorSize / 5;
  return {
    width: `${indicatorSize}px`,
    height: `${indicatorSize}px`,
    bottom: `${offset}px`,
    right: `${offset}px`,
    border: `${borderSize}px solid #18191c` // Feltételezve, hogy a háttér sötét
  };
});

// Composables
const appStore = useAppStore();
const { getUserColor, getInitials } = useUserDisplay();

// State
const imageError = ref(false);

// Computed
const displayName = computed(() => props.username || props.user?.username || 'Unknown');
const userId = computed(() => props.userId || (props.user && ('userId' in props.user ? props.user.userId : props.user.id)) || 0);
const isOnline = computed(() => appStore.onlineUsers.has(userId.value));

const initials = computed(() => {
  if (props.user) {
    return getInitials(props.user);
  }
  return getInitials({ username: displayName.value } as UserProfileDto);
});

// Methods
const handleImageError = () => {
  imageError.value = true;
};
</script>
