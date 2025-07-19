<template>
  <div v-for="member in members" :key="member.userId" class="flex items-center gap-2 p-2">
    <div class="relative">
      <img
          :alt="getDisplayName(member)"
          :src="getAvatarUrl(member)"
          class="w-8 h-8 rounded-full"
      >
      <div
          :class="['absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800', getStatusColor(member)]"
      />
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-white truncate">
        {{ getDisplayName(member) }}
      </div>
      <div class="text-xs text-gray-400 truncate">
        @{{ member.username }}
      </div>
    </div>
  </div>
</template>

<script setup>
import {useUserDisplay} from '@/composables/useUserDisplay';

const {getDisplayName, getAvatarUrl, getStatusColor} = useUserDisplay();
</script>