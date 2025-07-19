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

    <!-- Status / typing indicator -->
    <div
        v-if="showOnlineIndicator"
        class="status-indicator absolute flex items-center justify-center pointer-events-none"
        :class="{ typing: isTyping }"
        :style="onlineIndicatorStyles"
    >
      <template v-if="isTyping">
        <span class="typing-dots"><span></span><span></span><span></span></span>
      </template>
      <span
          v-else
          class="status-circle block rounded-full w-full h-full"
          :class="isOnline ? 'bg-green-500' : 'bg-gray-500'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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
  isTyping?: boolean;
}>(), {
  size: 40,
  showOnlineIndicator: false,
  className: 'rounded-full',
  isTyping: false
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
  const indicatorSize = Math.max(10, parsedSize.value / 3.2);
  const borderSize = Math.max(2, indicatorSize / 4.5);
  const offset = borderSize;
  if (props.isTyping) {
    return {
      width: `${indicatorSize * 1.8}px`,
      height: `${indicatorSize}px`,
      bottom: `${offset}px`,
      right: `${offset}px`,
      border: 'none',
    } as const;
  }
  return {
    width: `${indicatorSize}px`,
    height: `${indicatorSize}px`,
    bottom: `${offset}px`,
    right: `${offset}px`,
    border: `${borderSize}px solid #1e1f22`,
  } as const;
});

// Composables
const appStore = useAppStore();
const { getUserColor, getInitials } = useUserDisplay();

// State
const imageError = ref(false);

watch(() => props.avatarUrl, (newUrl, oldUrl) => {
  if (newUrl !== oldUrl) {
    imageError.value = false;
  }
});

// Computed
const displayName = computed(() => props.username || props.user?.username || 'Unknown');
const userId = computed(() => props.userId || (props.user && ('userId' in props.user ? props.user.userId : props.user.id)) || 0);
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
  return getInitials({ username: displayName.value } as UserProfileDto);
});

// Methods
const handleImageError = () => {
  imageError.value = true;
};
</script>
<style scoped>
.typing-dots {
  display: flex;
}

.typing-dots span {
  display: block;
  width: 3px;
  height: 3px;
  margin: 0 1px;
  background-color: currentColor;
  border-radius: 50%;
  opacity: 0.2;
  animation: typing-dot 1.2s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}

.status-indicator.typing {
  color: #9ca3af; /* text-gray-400 */
  background-color: #2f3136;
  padding: 0 2px;
  border: none !important;
}

.status-circle {
  border-radius: 50%;
}

@keyframes typing-dot {
  0%, 80%, 100% {
    opacity: 0.2;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>
