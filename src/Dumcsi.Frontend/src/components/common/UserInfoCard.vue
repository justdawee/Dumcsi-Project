<template>
  <Teleport to="body">
    <div
        v-if="visible"
        ref="cardRef"
        :style="positionStyle"
        class="fixed z-50"
    >
      <div class="bg-bg-surface rounded-lg shadow-lg border border-border-default p-4 w-64">
        <div class="flex items-center gap-3">
          <UserAvatar
              :avatar-url="avatarUrl"
              :user-id="userId"
              :username="user.username"
              :size="48"
              show-online-indicator
          />
          <div class="min-w-0">
            <p class="font-semibold text-text-default truncate">{{ displayName }}</p>
            <p class="text-sm text-text-tertiary truncate">{{ user.username }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import type {ServerMember} from '@/services/types';
import UserAvatar from './UserAvatar.vue';
import {useUserDisplay} from '@/composables/useUserDisplay';

const props = defineProps<{
  user: ServerMember;
  x: number;
  y: number;
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const cardRef = ref<HTMLElement | null>(null);
const visible = computed(() => props.modelValue);

const { getAvatarUrl, getDisplayName } = useUserDisplay();

const displayName = computed(() => getDisplayName(props.user));
const avatarUrl = computed(() => getAvatarUrl(props.user));
const userId = computed(() => {
  if ('userId' in props.user) return props.user.userId;
  return (props.user as any).id as number;
});

const positionStyle = computed(() => {
  let left = props.x;
  let top = props.y;
  const cardWidth = 256; // w-64
  const cardHeight = 80; // approximate
  if (typeof window !== 'undefined') {
    if (left + cardWidth > window.innerWidth) {
      left = window.innerWidth - cardWidth - 10;
    }
    if (left < 0) {
      left = 10;
    }
    if (top + cardHeight > window.innerHeight) {
      top = window.innerHeight - cardHeight - 10;
    }
    if (top < 0) {
      top = 10;
    }
  }
  return { left: `${left}px`, top: `${top}px` };
});

const handleClickOutside = (e: MouseEvent) => {
  if (cardRef.value && !cardRef.value.contains(e.target as Node)) {
    emit('update:modelValue', false);
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch(() => props.modelValue, (val) => {
  if (!val) return;
});
</script>

<style scoped>
</style>