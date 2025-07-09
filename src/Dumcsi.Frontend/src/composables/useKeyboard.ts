import { onMounted, onUnmounted } from 'vue'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  function handleKeyDown(event: KeyboardEvent) {
    for (const shortcut of shortcuts) {
      const ctrlKey = shortcut.ctrl ?? false
      const shiftKey = shortcut.shift ?? false
      const altKey = shortcut.alt ?? false
      const metaKey = shortcut.meta ?? false

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        event.ctrlKey === ctrlKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey &&
        event.metaKey === metaKey
      ) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.action()
        break
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
}

export function formatShortcut(shortcut: Omit<KeyboardShortcut, 'action'>): string {
  const parts: string[] = []
  
  if (shortcut.meta) parts.push('⌘')
  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.alt) parts.push('Alt')
  if (shortcut.shift) parts.push('Shift')
  
  parts.push(shortcut.key.toUpperCase())
  
  return parts.join('+')
}