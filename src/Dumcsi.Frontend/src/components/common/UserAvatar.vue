<template>
  <div class="relative inline-block">
    <img 
      :src="avatarUrl" 
      :alt="displayName"
      :class="['rounded-full object-cover', sizeClasses[size]]"
      @error="handleImageError"
    >
    <div 
      v-if="showStatus && user?.isOnline !== undefined"
      :class="[
        'absolute bottom-0 right-0 rounded-full border-2',
        statusClasses[size],
        user.isOnline ? 'bg-green-500' : 'bg-gray-500',
        `border-${borderColor}`
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUserDisplay } from '@/composables/useUserDisplay';
import type { UserLike } from '@/composables/useUserDisplay';

interface Props {
  user: UserLike & { 
    avatarUrl?: string | null; 
    profilePictureUrl?: string | null;
    isOnline?: boolean;
  } | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  borderColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showStatus: false,
  borderColor: 'gray-800'
});

const { getDisplayName, getAvatarUrl } = useUserDisplay();

const defaultAvatar = '/default-avatar.png';
const imageError = ref(false);

const displayName = computed(() => getDisplayName(props.user));
const avatarUrl = computed(() => {
  if (imageError.value) return defaultAvatar;
  return getAvatarUrl(props.user);
});

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const statusClasses = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4'
};

const handleImageError = () => {
  imageError.value = true;
};
</script>