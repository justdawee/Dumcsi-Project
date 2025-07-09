<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 space-y-2">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'min-w-[300px] max-w-[500px] p-4 rounded-xl shadow-lg flex items-start gap-3',
            notificationClasses[notification.type]
          ]"
        >
          <component
            :is="notificationIcons[notification.type]"
            class="w-5 h-5 flex-shrink-0 mt-0.5"
          />
          
          <div class="flex-1 min-w-0">
            <h4 v-if="notification.title" class="font-semibold mb-1">
              {{ notification.title }}
            </h4>
            <p class="text-sm">{{ notification.message }}</p>
          </div>

          <button
            @click="removeNotification(notification.id)"
            class="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-vue-next'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])

const notificationClasses = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-[var(--accent-secondary)] text-white',
  info: 'bg-[var(--accent-primary)] text-white'
}

const notificationIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info
}

function addNotification(notification: Omit<Notification, 'id'>) {
  const id = Date.now().toString()
  const newNotification = { ...notification, id }
  
  notifications.value.push(newNotification)
  
  // Auto-remove after duration
  if (notification.duration !== 0) {
    setTimeout(() => {
      removeNotification(id)
    }, notification.duration || 5000)
  }
}

function removeNotification(id: string) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// Export functions for use in other components
defineExpose({
  addNotification,
  removeNotification
})
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>