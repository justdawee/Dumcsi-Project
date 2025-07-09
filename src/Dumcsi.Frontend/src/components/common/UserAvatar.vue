<template>
  <div class="relative inline-block" :style="{ width: size + 'px', height: size + 'px' }">
    <div
      :class="[
        'rounded-full overflow-hidden flex items-center justify-center font-semibold',
        `bg-[var(--accent-primary)]`
      ]"
      :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.4 + 'px' }"
    >
      <img
        v-if="user.avatarUrl"
        :src="user.avatarUrl"
        :alt="user.username"
        class="w-full h-full object-cover"
      />
      <span v-else class="text-white uppercase">
        {{ user.username.substring(0, 2) }}
      </span>
    </div>
    
    <!-- Online status indicator -->
    <span
      v-if="showOnlineStatus && user.isOnline"
      :class="[
        'absolute bottom-0 right-0 bg-green-400 rounded-full ring-2 ring-[var(--bg-secondary)]',
        size > 40 ? 'w-4 h-4' : 'w-3 h-3'
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import type { User } from '@/types'

interface Props {
  user: User
  size?: number
  showOnlineStatus?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 40,
  showOnlineStatus: true
})