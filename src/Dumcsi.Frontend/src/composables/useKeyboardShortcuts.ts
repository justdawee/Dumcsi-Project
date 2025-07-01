import { onMounted, onUnmounted } from 'vue'

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (event: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = (event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event
    
    shortcuts.forEach(shortcut => {
      const matchesKey = shortcut.key.toLowerCase() === key.toLowerCase()
      const matchesCtrl = shortcut.ctrl ? (ctrlKey || metaKey) : !ctrlKey && !metaKey
      const matchesShift = shortcut.shift ? shiftKey : !shiftKey
      const matchesAlt = shortcut.alt ? altKey : !altKey
      
      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        event.preventDefault()
        shortcut.handler(event)
      }
    })
  }
  
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
}

// Example usage:
// useKeyboardShortcuts([
//   { key: 'k', ctrl: true, handler: () => console.log('Ctrl+K pressed') },
//   { key: 'Enter', shift: true, handler: () => console.log('Shift+Enter pressed') }
// ])