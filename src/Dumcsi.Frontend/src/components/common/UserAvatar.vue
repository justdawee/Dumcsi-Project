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
      <span v-else :style="{ fontSize: `${size * 0.4}px` }">
        {{ initials }}
      </span>
    </div>

    <!-- Status indicator overlay -->
    <div
        v-if="showOnlineIndicator && (isOnline || isTyping)"
        :class="{
        'status-online': isOnline && !isTyping,
        'status-typing': isTyping
      }"
        :style="statusIndicatorStyles"
        class="status-indicator"
    >
      <!-- Typing indicator -->
      <div v-if="isTyping" class="typing-indicator-content">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
      <!-- Online indicator -->
      <div v-else class="online-indicator"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue';
import {useUserDisplay} from '@/composables/useUserDisplay';
import {useAppStore} from '@/stores/app';
import type {UserProfileDto, ServerMemberDto} from '@/services/types';

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
}>(), {
  size: 40,
  showOnlineIndicator: false,
  isTyping: false,
});

// Composables
const {getUserColor, getInitials} = useUserDisplay();
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

// Calculate status indicator size and position based on avatar size
const statusIndicatorStyles = computed(() => {
  const avatarSize = props.size;
  const isSmall = avatarSize <= 32;
  const isMedium = avatarSize <= 40;

  let indicatorSize;
  let indicatorOffset;

  if (props.isTyping) {
    // Typing indicator sizes
    if (isSmall) {
      indicatorSize = 16;
      indicatorOffset = -2;
    } else if (isMedium) {
      indicatorSize = 20;
      indicatorOffset = -3;
    } else {
      indicatorSize = 24;
      indicatorOffset = -4;
    }
  } else {
    // Online indicator sizes
    if (isSmall) {
      indicatorSize = 10;
      indicatorOffset = -2;
    } else if (isMedium) {
      indicatorSize = 12;
      indicatorOffset = -2;
    } else {
      indicatorSize = 14;
      indicatorOffset = -3;
    }
  }

  return {
    width: props.isTyping ? `${indicatorSize}px` : `${indicatorSize}px`,
    height: props.isTyping ? `${indicatorSize * 0.5}px` : `${indicatorSize}px`,
    bottom: `${indicatorOffset}px`,
    right: `${indicatorOffset}px`,
  };
});

// Methods
const handleImageError = () => {
  imageError.value = true;
};
</script>

<style scoped>
.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-container {
  position: relative;
}

/* Status indicator container */
.status-indicator {
  position: absolute;
  background-color: #1e1f22;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 3px #1e1f22;
}

/* Online status */
.status-online .online-indicator {
  width: 100%;
  height: 100%;
  background-color: #23a55a;
  border-radius: 50%;
}

/* Typing indicator */
.status-typing {
  background-color: #313338;
  padding: 0 4px;
}

.typing-indicator-content {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
}

.typing-dot {
  width: 3px;
  height: 3px;
  background-color: #b5bac1;
  border-radius: 50%;
  animation: typing-animation 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-animation {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

/* Responsive sizing */
@media (max-width: 640px) {
  .status-indicator {
    box-shadow: 0 0 0 2px #1e1f22;
  }
}
</style>