import { ref } from 'vue'
import type { Toast } from '@/types'

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const generateId = (): string => Math.random().toString(36).substring(2, 9)

  const addToast = (toast: Omit<Toast, 'id'>): void => {
    const newToast: Toast = {
      ...toast,
      id: generateId(),
      duration: toast.duration ?? 5000
    }
    
    toasts.value.push(newToast)

    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(newToast.id)
      }, newToast.duration)
    }
  }

  const removeToast = (id: string): void => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearToasts = (): void => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    clearToasts
  }
}