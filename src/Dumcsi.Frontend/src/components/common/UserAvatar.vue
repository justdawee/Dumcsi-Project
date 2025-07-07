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
  size?: number;
  showOnlineIndicator?: boolean;
  className?: string;
}>(), {
  size: 40,
  showOnlineIndicator: false,
  className: 'rounded-full'
});

// Composables
const { getDisplayName, getInitials, getUserColor } = useUserDisplay();
const appStore = useAppStore();

// State
const imageError = ref(false);

// Computed
const displayName = computed(() => {
  if (props.user) return getDisplayName(props.user);
  return props.username || 'Unknown User';
});

const initials = computed(() => {
  if (props.user) return getInitials(props.user);
  
  const name = props.username || 'Unknown User';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

const userId = computed(() => {
  if (props.user && 'id' in props.user) return props.user.id;
  if (props.user && 'userId' in props.user) return props.user.userId;
  return props.userId || 0;
});

const isOnline = computed(() => {
  return appStore.onlineUsers.has(userId.value);
});

const sizeClasses = computed(() => {
  const sizeMap: Record<number, string> = {
    24: 'w-6 h-6',
    32: 'w-8 h-8',
    40: 'w-10 h-10',
    48: 'w-12 h-12',
    64: 'w-16 h-16',
    80: 'w-20 h-20',
    128: 'w-32 h-32'
  };
  return sizeMap[props.size] || `w-[${props.size}px] h-[${props.size}px]`;
});

const textSizeClass = computed(() => {
  if (props.size <= 24) return 'text-xs';
  if (props.size <= 32) return 'text-sm';
  if (props.size <= 48) return 'text-base';
  if (props.size <= 64) return 'text-lg';
  return 'text-xl';
});

const onlineIndicatorClasses = computed(() => {
  if (props.size <= 32) {
    return 'bottom-0 right-0 w-2 h-2 border';
  } else if (props.size <= 48) {
    return 'bottom-0 right-0 w-3 h-3 border-2';
  } else {
    return 'bottom-1 right-1 w-4 h-4 border-2';
  }
});

// Methods
const handleImageError = () => {
  imageError.value = true;
};</script>