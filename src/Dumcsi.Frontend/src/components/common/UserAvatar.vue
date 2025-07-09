<template>
  <div :class="containerClasses" class="relative flex-shrink-0">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      :class="imageClasses"
      @error="handleImageError"
    />
    <div v-else :class="fallbackClasses">
      <span :class="textClasses">{{ initials }}</span>
    </div>
    
    <div v-if="showStatus" :class="statusClasses">
      <div :class="statusDotClasses"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  src?: string | null
  alt?: string
  username?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'idle' | 'dnd'
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'User avatar',
  username: 'Unknown',
  size: 'md',
  status: 'offline',
  showStatus: false
})

const imageError = ref(false)

const initials = computed(() => {
  return props.username
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
})

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

const statusSizeClasses = {
  xs: 'w-2 h-2 -bottom-0.5 -right-0.5',
  sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  md: 'w-3 h-3 -bottom-1 -right-1',
  lg: 'w-3.5 h-3.5 -bottom-1 -right-1',
  xl: 'w-4 h-4 -bottom-1.5 -right-1.5'
}

const containerClasses = computed(() => sizeClasses[props.size])

const imageClasses = computed(() => 
  `${sizeClasses[props.size]} rounded-full object-cover`
)

const fallbackClasses = computed(() => 
  `${sizeClasses[props.size]} rounded-full bg-discord-blurple flex items-center justify-center`
)

const textClasses = computed(() => 
  `${textSizeClasses[props.size]} font-medium text-white`
)

const statusClasses = computed(() => 
  `absolute ${statusSizeClasses[props.size]} bg-discord-gray-800 rounded-full flex items-center justify-center`
)

const statusDotClasses = computed(() => {
  const baseClasses = 'w-full h-full rounded-full'
  const statusColors = {
    online: 'bg-discord-green',
    offline: 'bg-discord-gray-500',
    idle: 'bg-discord-yellow',
    dnd: 'bg-discord-red'
  }
  
  return `${baseClasses} ${statusColors[props.status]}`
})

const handleImageError = () => {
  imageError.value = true
}
</script>