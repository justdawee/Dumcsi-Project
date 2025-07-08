<template>
  <div 
    :class="[
      'relative flex items-center justify-center bg-gray-700 text-white font-semibold overflow-hidden',
      sizeClasses,
      className
    ]"
    :style="{ backgroundColor: !avatarUrl && user ? getUserColor(userId) : undefined }"
  >
    <img 
      v-if="avatarUrl && !imageError" 
      :src="avatarUrl" 
      :alt="displayName"
      class="w-full h-full object-cover"
      @error="handleImageError"
    />
    <span v-else :class="textSizeClass">
      {{ initials }}
    </span>
    
    <!-- Online indicator -->
    <div 
      v-if="showOnlineIndicator && isOnline"
      :class="[
        'absolute border-gray-800 bg-green-500 rounded-full',
        onlineIndicatorClasses
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserDisplay } from '@/composables/useUserDisplay';
import { useAppStore } from '@/stores/app';
import type { UserDto, UserProfile, UserSearchResult, ServerMember } from '@/services/types';

// Props
const props = withDefaults(defineProps<{
  user?: UserDto | UserProfile | UserSearchResult | ServerMember | null;
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
      'xs': 24,
      'sm': 32,
      'md': 40,
      'lg': 48,
      'xl': 56
    };
    return sizeMap[props.size] || 40;
  }
  return props.size;
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
  return getInitials({ username: displayName.value } as UserDto);
});

const sizeClasses = computed(() => {
  const size = parsedSize.value;
  if (size <= 24) return 'w-6 h-6';
  if (size <= 32) return 'w-8 h-8';
  if (size <= 40) return 'w-10 h-10';
  if (size <= 48) return 'w-12 h-12';
  return 'w-14 h-14';
});

const textSizeClass = computed(() => {
  const size = parsedSize.value;
  if (size <= 24) return 'text-xs';
  if (size <= 32) return 'text-sm';
  if (size <= 40) return 'text-base';
  return 'text-lg';
});

const onlineIndicatorClasses = computed(() => {
  const size = parsedSize.value;
  if (size <= 32) return 'w-2 h-2 bottom-0 right-0 border';
  if (size <= 40) return 'w-3 h-3 bottom-0 right-0 border-2';
  return 'w-4 h-4 bottom-1 right-1 border-2';
});

// Methods
const handleImageError = () => {
  imageError.value = true;
};
</script>