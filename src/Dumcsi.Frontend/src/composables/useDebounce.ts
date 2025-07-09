import { ref, customRef } from 'vue'

export function useDebounce<T>(value: T, delay = 300) {
  let timeout: number | undefined
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue: T) {
        clearTimeout(timeout)
        timeout = window.setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

export function useDebounceFn<T extends (...args: any[]) => any>(fn: T, delay = 300) {
  let timeout: number | undefined
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout)
    return new Promise<ReturnType<T>>((resolve) => {
      timeout = window.setTimeout(() => {
        resolve(fn(...args))
      }, delay)
    })
  }) as T
}