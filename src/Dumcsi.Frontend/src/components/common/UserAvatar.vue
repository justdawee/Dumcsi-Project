<template>
  <div :style="{ width: `${size}px`, height: `${size}px` }" class="avatar-wrapper">
    <div
        :class="[
        'avatar-container relative flex-shrink-0 flex items-center justify-center bg-gray-700 text-white font-semibold overflow-hidden rounded-full',
        className
      ]"
        :style="[
        {
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: !avatarUrl && user ? getUserColor(userId) : undefined
        }
      ]"
    >
      <img
          v-if="avatarUrl && !imageError"
          :alt="displayName"
          :src="avatarUrl"
          class="w-full h-full object-cover"
          @error="handleImageError"
      />
      <span v-else :style="{ fontSize: `${size! * 0.4}px` }">
        {{ initials }}
      </span>
    </div>

    <!-- Status indicator overlay with animation -->
    <div
        v-if="showOnlineIndicator && (isOnline || isTyping)"
        class="status-indicator"
        :class="{ 'is-typing': isTyping }"
        :style="statusIndicatorStyles"
    >
        <!-- Typing indicator -->
        <div v-if="isTyping" key="typing" class="typing-indicator-content">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
        <!-- Online indicator -->
        <div v-else key="online" class="online-indicator" :style="{ backgroundColor: statusColor }"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue';
import {useUserDisplay} from '@/composables/useUserDisplay';
import { useStatusColor } from '@/composables/useStatusColor';
import {useAppStore} from '@/stores/app';
import { UserStatus } from '@/services/types';
import type { UserProfileDto, ServerMemberDto } from '@/services/types';

// Props
const props = withDefaults(defineProps<{
  user?: UserProfileDto | ServerMemberDto | null;
  avatarUrl?: string | null;
  username?: string;
  userId?: number;
  size?: number;
  showOnlineIndicator?: boolean;
  className?: string;
  isTyping?: boolean;
  indicatorBgColor?: string;
}>(), {
  size: 40,
  showOnlineIndicator: false,
  isTyping: false,
  indicatorBgColor: '',
});

// Composables
const {getUserColor, getInitials} = useUserDisplay();
const { getStatusColor } = useStatusColor();
const appStore = useAppStore();

// State
const imageError = ref(false);

// Computed
const displayName = computed(() => {
  if (props.user) {
    return ('serverNickname' in props.user && props.user.serverNickname) || props.user.username;
  }
  return props.username || 'Unknown';
});

const userId = computed(() =>
    props.userId || (props.user && ('userId' in props.user ? props.user.userId : props.user.id)) || 0
);

const userStatus = computed<UserStatus>(() => {
  if (props.user && 'status' in props.user && (props.user as any).status) {
    return (props.user as any).status as UserStatus;
  }
  return isOnline.value ? UserStatus.Online : UserStatus.Offline;
});

const isOnline = computed(() => {
  if (props.user && 'isOnline' in props.user && typeof (props.user as any).isOnline === 'boolean') {
    return (props.user as any).isOnline as boolean;
  }
  return appStore.onlineUsers.has(userId.value);
});

const initials = computed(() => {
  if (props.user) {
    return getInitials(props.user);
  }
  return getInitials({username: displayName.value} as UserProfileDto);
});

const statusColor = computed(() => getStatusColor(userStatus.value));

// Status indicator styles
const statusIndicatorStyles = computed(() => {
  const MIN_AVATAR_SIZE = 32;
  const avatarSize = Math.max(props.size!, MIN_AVATAR_SIZE);

  const indicatorRatio = 0.25;
  const baseSize = Math.max(8, Math.round(avatarSize * indicatorRatio));
  const indicatorRadius = baseSize / 2;

  const minMultiplier = 2.0;
  const maxMultiplier = 2.5;
  const minSize = 32;
  const maxSize = 200;

  const progress = Math.min(1, Math.max(0, (avatarSize - minSize) / (maxSize - minSize)));
  const edgeInsetMultiplier = minMultiplier + (maxMultiplier - minMultiplier) * progress;

  const edgeInset = Math.round(indicatorRadius * edgeInsetMultiplier);
  const offset = edgeInset - indicatorRadius;

  const styles: Record<string,string> = {
    '--indicator-base-size': `${baseSize}px`,
    '--indicator-bg-color': props.indicatorBgColor,
    '--indicator-status-color': statusColor.value,
    bottom: `${offset}px`,
    right: `${offset}px`,
  };

  return styles;
});


// Methods
const handleImageError = () => {
  imageError.value = true;
};
</script>
