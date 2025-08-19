import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app';
import type { KeyBinding, KeyBindCategory, ParsedKey, KeyModifier } from '@/types/keybinds';

const isRecording = ref(false);
const recordingCallback = ref<((key: string) => void) | null>(null);

// Platform detection
const isMac = computed(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);

// Parse key combination into modifiers and key
function parseKey(keyString: string): ParsedKey {
  const parts = keyString.toLowerCase().split('+').map(p => p.trim());
  const modifiers: KeyModifier[] = [];
  let key = '';

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        modifiers.push('ctrl');
        break;
      case 'alt':
        modifiers.push('alt');
        break;
      case 'shift':
        modifiers.push('shift');
        break;
      case 'cmd':
      case 'meta':
      case '⌘':
        modifiers.push('meta');
        break;
      case '⌥':
        modifiers.push('alt');
        break;
      case '⇧':
        modifiers.push('shift');
        break;
      default:
        key = part;
    }
  }

  const displayName = formatKeyForDisplay(modifiers, key);
  return { modifiers, key, displayName };
}

// Format key combination for display
function formatKeyForDisplay(modifiers: KeyModifier[], key: string): string {
  const platform = isMac.value ? 'mac' : 'windows';
  const modifierSymbols = {
    mac: {
      meta: '⌘',
      ctrl: '⌃',
      alt: '⌥',
      shift: '⇧'
    },
    windows: {
      meta: 'Win',
      ctrl: 'Ctrl',
      alt: 'Alt',
      shift: 'Shift'
    }
  };

  const symbols = modifierSymbols[platform];
  const modifierStrings = modifiers.map(mod => symbols[mod]);
  
  // Format key name
  let keyName = key;
  switch (key.toLowerCase()) {
    case 'arrowup': keyName = '↑'; break;
    case 'arrowdown': keyName = '↓'; break;
    case 'arrowleft': keyName = '←'; break;
    case 'arrowright': keyName = '→'; break;
    case 'escape': keyName = 'Esc'; break;
    case 'enter': keyName = platform === 'mac' ? 'Return' : 'Enter'; break;
    case ' ': keyName = 'Space'; break;
    default:
      if (key.length === 1) {
        keyName = key.toUpperCase();
      }
  }

  return platform === 'mac' 
    ? [...modifierStrings, keyName].join('')
    : [...modifierStrings, keyName].join(' + ');
}

export function useKeyBinds() {
  const router = useRouter();
  const route = useRoute();
  const appStore = useAppStore();

  // Determine current scope based on route
  const getCurrentScope = (): string => {
    if (!route.name) return 'global';
    
    const routeName = route.name.toString();
    if (routeName === 'Channel' || routeName === 'VoiceChannel') return 'channel';
    if (routeName === 'DirectMessage') return 'dm';
    if (routeName === 'Settings') return 'settings';
    if (routeName === 'VoiceChannel') return 'voice';
    
    return 'global';
  };

  // Get stored keybinds from localStorage
  const getStoredKeyBinds = (): Record<string, string> => {
    try {
      const stored = localStorage.getItem('dumcsi-keybinds');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Save keybinds to localStorage
  const saveKeyBinds = (keybinds: Record<string, string>) => {
    localStorage.setItem('dumcsi-keybinds', JSON.stringify(keybinds));
  };

  // Define all keyboard shortcuts
  const createKeyBinds = (): KeyBindCategory[] => {
    const storedBinds = getStoredKeyBinds();

    return [
      {
        id: 'general',
        name: 'General Navigation',
        keybinds: [
          {
            id: 'open-settings',
            name: 'Open User Settings',
            category: 'general',
            description: 'Open the user settings panel',
            defaultKey: { windows: 'Ctrl+,', mac: '⌘+,' },
            currentKey: storedBinds['open-settings'],
            action: () => router.push({ name: 'Settings' })
          },
          {
            id: 'open-shortcuts',
            name: 'Open Keyboard Shortcuts',
            category: 'general',
            description: 'View all keyboard shortcuts',
            defaultKey: { windows: 'Ctrl+/', mac: '⌘+/' },
            currentKey: storedBinds['open-shortcuts'],
            action: () => {
              // Emit an event that can be caught by the main app
              window.dispatchEvent(new CustomEvent('openKeyboardShortcuts'));
            }
          },
          {
            id: 'create-server',
            name: 'Create or Join Server',
            category: 'general',
            description: 'Open create/join server dialog',
            defaultKey: { windows: 'Ctrl+Shift+N', mac: '⌘+Shift+N' },
            currentKey: storedBinds['create-server'],
            action: () => {
              console.log('🔧 Create/join server dialog not implemented yet');
            }
          },
          {
            id: 'navigate-back',
            name: 'Navigate Back',
            category: 'general',
            description: 'Go back to previous page',
            defaultKey: { windows: 'Alt+ArrowLeft', mac: 'Alt+ArrowLeft' },
            currentKey: storedBinds['navigate-back'],
            action: () => router.back()
          }
        ]
      },
      {
        id: 'main-functions',
        name: 'Main Functions',
        keybinds: [
          {
            id: 'search-channel',
            name: 'Search in Channel',
            category: 'main-functions',
            description: 'Search within the current channel',
            defaultKey: { windows: 'Ctrl+F', mac: '⌘+F' },
            currentKey: storedBinds['search-channel'],
            action: () => {
              console.log('🔧 Channel search not implemented yet');
            }
          },
          {
            id: 'search-all',
            name: 'Search All Channels',
            category: 'main-functions',
            description: 'Search across all channels',
            defaultKey: { windows: 'Ctrl+Shift+F', mac: '⌘+Shift+F' },
            currentKey: storedBinds['search-all'],
            action: () => {
              console.log('🔧 Global search not implemented yet');
            }
          },
          {
            id: 'emoji-picker',
            name: 'Open Emoji Picker',
            category: 'main-functions',
            description: 'Open the emoji picker',
            defaultKey: { windows: 'Ctrl+E', mac: '⌘+E' },
            currentKey: storedBinds['emoji-picker'],
            action: () => {
              console.log('🔧 Emoji picker not implemented yet');
            }
          },
          {
            id: 'gif-picker',
            name: 'Open GIF Picker',
            category: 'main-functions',
            description: 'Open the GIF picker',
            scope: 'channel',
            defaultKey: { windows: 'Ctrl+G', mac: '⌘+G' },
            currentKey: storedBinds['gif-picker'],
            action: () => {
              // Trigger GIF picker in MessageInput component
              const event = new CustomEvent('toggleGifPicker');
              window.dispatchEvent(event);
            }
          }
        ]
      },
      {
        id: 'message-navigation',
        name: 'Message Navigation',
        keybinds: [
          {
            id: 'browse-history',
            name: 'Browse Channel History',
            category: 'message-navigation',
            description: 'Navigate through channel message history',
            defaultKey: { windows: 'Ctrl+ArrowUp/ArrowDown', mac: '⌘+ArrowUp/ArrowDown' },
            currentKey: storedBinds['browse-history'],
            action: () => {
              console.log('🔧 Channel history navigation not implemented yet');
            }
          },
          {
            id: 'edit-last-message',
            name: 'Edit Last Message',
            category: 'message-navigation',
            description: 'Edit your most recent message',
            scope: 'channel',
            defaultKey: { windows: 'ArrowUp', mac: 'ArrowUp' },
            currentKey: storedBinds['edit-last-message'],
            action: () => {
              // Trigger edit last message
              const event = new CustomEvent('editLastMessage');
              window.dispatchEvent(event);
            }
          },
          {
            id: 'cancel-message',
            name: 'Cancel Message',
            category: 'message-navigation',
            description: 'Cancel current message or mark channel as read',
            defaultKey: { windows: 'Escape', mac: 'Escape' },
            currentKey: storedBinds['cancel-message'],
            action: () => {
              console.log('🔧 Cancel message not implemented yet');
            }
          },
          {
            id: 'move-channels',
            name: 'Move Between Channels',
            category: 'message-navigation',
            description: 'Navigate between channels',
            defaultKey: { windows: 'Alt+ArrowUp/ArrowDown', mac: '⌥+ArrowUp/ArrowDown' },
            currentKey: storedBinds['move-channels'],
            action: () => {
              console.log('🔧 Channel navigation not implemented yet');
            }
          }
        ]
      },
      {
        id: 'server-channel',
        name: 'Server & Channel Navigation',
        keybinds: [
          {
            id: 'quick-switcher',
            name: 'Quick Switcher',
            category: 'server-channel',
            description: 'Quick switcher for channels/DMs',
            defaultKey: { windows: 'Ctrl+K', mac: '⌘+K' },
            currentKey: storedBinds['quick-switcher'],
            action: () => {
              console.log('🔧 Quick switcher not implemented yet');
            }
          },
          {
            id: 'toggle-mute',
            name: 'Toggle Microphone',
            category: 'server-channel',
            description: 'Mute/unmute microphone',
            defaultKey: { windows: 'Ctrl+Shift+M', mac: '⌘+Shift+M' },
            currentKey: storedBinds['toggle-mute'],
            action: () => {
              if (appStore.currentVoiceChannelId) {
                appStore.toggleSelfMute();
              } else {
                console.log('🔧 Not in voice channel');
              }
            }
          },
          {
            id: 'toggle-deafen',
            name: 'Toggle Deafen',
            category: 'server-channel',
            description: 'Deafen/undeafen audio',
            defaultKey: { windows: 'Ctrl+Shift+D', mac: '⌘+Shift+D' },
            currentKey: storedBinds['toggle-deafen'],
            action: () => {
              if (appStore.currentVoiceChannelId) {
                appStore.toggleSelfDeafen();
              } else {
                console.log('🔧 Not in voice channel');
              }
            }
          },
          {
            id: 'switch-servers',
            name: 'Switch Between Servers',
            category: 'server-channel',
            description: 'Navigate between servers',
            defaultKey: { windows: 'Ctrl+Alt+ArrowLeft/ArrowRight', mac: '⌘+⌥+ArrowUp/ArrowDown' },
            currentKey: storedBinds['switch-servers'],
            action: () => {
              console.log('🔧 Server switching not implemented yet');
            }
          }
        ]
      },
      {
        id: 'accessibility',
        name: 'Accessibility Navigation',
        keybinds: [
          {
            id: 'toggle-pins',
            name: 'Toggle Pins',
            category: 'accessibility',
            description: 'Toggle pins popout',
            defaultKey: { windows: 'Ctrl+P', mac: '⌘+P' },
            currentKey: storedBinds['toggle-pins'],
            action: () => {
              console.log('🔧 Pins popout not implemented yet');
            }
          },
          {
            id: 'toggle-mentions',
            name: 'Toggle Mentions',
            category: 'accessibility',
            description: 'Toggle mentions popout',
            defaultKey: { windows: 'Ctrl+Alt+@', mac: '⌘+⌥+@' },
            currentKey: storedBinds['toggle-mentions'],
            action: () => {
              console.log('🔧 Mentions popout not implemented yet');
            }
          },
          {
            id: 'toggle-member-list',
            name: 'Toggle Member List',
            category: 'accessibility',
            description: 'Toggle channel member list',
            scope: 'channel',
            defaultKey: { windows: 'Ctrl+U', mac: '⌘+U' },
            currentKey: storedBinds['toggle-member-list'],
            action: () => {
              // Trigger member list toggle
              const event = new CustomEvent('toggleMemberList');
              window.dispatchEvent(event);
            }
          },
          {
            id: 'upload-file',
            name: 'Upload File',
            category: 'accessibility',
            description: 'Upload a file',
            scope: 'channel',
            defaultKey: { windows: 'Ctrl+Shift+U', mac: '⌘+⇧+U' },
            currentKey: storedBinds['upload-file'],
            action: () => {
              // Trigger file upload dialog
              const event = new CustomEvent('triggerFileUpload');
              window.dispatchEvent(event);
            }
          },
          {
            id: 'get-help',
            name: 'Get Help',
            category: 'accessibility',
            description: 'Open help documentation',
            defaultKey: { windows: 'Ctrl+Shift+H', mac: '⌘+⇧+H' },
            currentKey: storedBinds['get-help'],
            action: () => {
              console.log('🔧 Help system not implemented yet');
            }
          }
        ]
      },
      {
        id: 'text-formatting',
        name: 'Text Formatting',
        keybinds: [
          {
            id: 'bold-text',
            name: 'Bold Text',
            category: 'text-formatting',
            description: 'Make selected text bold',
            defaultKey: { windows: 'Ctrl+B', mac: '⌘+B' },
            currentKey: storedBinds['bold-text'],
            action: () => {
              console.log('🔧 Bold text formatting not implemented yet');
            }
          },
          {
            id: 'italic-text',
            name: 'Italic Text',
            category: 'text-formatting',
            description: 'Make selected text italic',
            defaultKey: { windows: 'Ctrl+I', mac: '⌘+I' },
            currentKey: storedBinds['italic-text'],
            action: () => {
              console.log('🔧 Italic text formatting not implemented yet');
            }
          },
          {
            id: 'underline-text',
            name: 'Underline Text',
            category: 'text-formatting',
            description: 'Underline selected text',
            defaultKey: { windows: 'Ctrl+U', mac: '⌘+U' },
            currentKey: storedBinds['underline-text'],
            action: () => {
              console.log('🔧 Underline text formatting not implemented yet');
            }
          }
        ]
      }
    ];
  };

  const keyBindCategories = ref<KeyBindCategory[]>(createKeyBinds());

  // Check if event matches a key combination
  const matchesKeyCombination = (event: KeyboardEvent, keyString: string): boolean => {
    const parsed = parseKey(keyString);
    
    // Check modifiers
    const hasCtrl = parsed.modifiers.includes('ctrl');
    const hasAlt = parsed.modifiers.includes('alt');
    const hasShift = parsed.modifiers.includes('shift');
    const hasMeta = parsed.modifiers.includes('meta');

    if (event.ctrlKey !== hasCtrl || 
        event.altKey !== hasAlt || 
        event.shiftKey !== hasShift || 
        event.metaKey !== hasMeta) {
      return false;
    }

    // Check key
    const eventKey = event.key.toLowerCase();
    const targetKey = parsed.key.toLowerCase();

    return eventKey === targetKey || 
           event.code.toLowerCase() === targetKey ||
           (eventKey === ' ' && targetKey === 'space') ||
           (event.code === 'Space' && targetKey === 'space');
  };

  // Global keydown handler
  const handleKeyDown = (event: KeyboardEvent) => {
    // Skip if recording a new keybind
    if (isRecording.value && recordingCallback.value) {
      event.preventDefault();
      const key = formatKeyFromEvent(event);
      recordingCallback.value(key);
      isRecording.value = false;
      recordingCallback.value = null;
      return;
    }

    // Skip if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const currentScope = getCurrentScope();

    // Check all keybinds
    for (const category of keyBindCategories.value) {
      for (const binding of category.keybinds) {
        // Check if binding is applicable in current scope
        if (binding.scope && binding.scope !== 'global' && binding.scope !== currentScope) {
          continue;
        }

        const keyToCheck = binding.currentKey || binding.defaultKey[isMac.value ? 'mac' : 'windows'];
        
        if (matchesKeyCombination(event, keyToCheck)) {
          event.preventDefault();
          binding.action();
          return;
        }
      }
    }
  };

  // Format key from keyboard event
  const formatKeyFromEvent = (event: KeyboardEvent): string => {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push(isMac.value ? '⌘' : 'Win');

    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    return [...modifiers, key].join('+');
  };

  // Record new keybind
  const recordKeybind = (callback: (key: string) => void) => {
    isRecording.value = true;
    recordingCallback.value = callback;
  };

  // Update keybind
  const updateKeybind = (bindingId: string, newKey: string) => {
    const storedBinds = getStoredKeyBinds();
    storedBinds[bindingId] = newKey;
    saveKeyBinds(storedBinds);

    // Update in memory
    for (const category of keyBindCategories.value) {
      const binding = category.keybinds.find(b => b.id === bindingId);
      if (binding) {
        binding.currentKey = newKey;
        break;
      }
    }
  };

  // Reset keybind to default
  const resetKeybind = (bindingId: string) => {
    const storedBinds = getStoredKeyBinds();
    delete storedBinds[bindingId];
    saveKeyBinds(storedBinds);

    // Update in memory
    for (const category of keyBindCategories.value) {
      const binding = category.keybinds.find(b => b.id === bindingId);
      if (binding) {
        binding.currentKey = undefined;
        break;
      }
    }
  };

  // Reset all keybinds
  const resetAllKeybinds = () => {
    localStorage.removeItem('dumcsi-keybinds');
    for (const category of keyBindCategories.value) {
      for (const binding of category.keybinds) {
        binding.currentKey = undefined;
      }
    }
  };

  // Get current key for binding
  const getCurrentKey = (binding: KeyBinding): string => {
    return binding.currentKey || binding.defaultKey[isMac.value ? 'mac' : 'windows'];
  };

  // Initialize keyboard shortcuts
  const initializeKeyBinds = () => {
    document.addEventListener('keydown', handleKeyDown);
  };

  // Cleanup keyboard shortcuts
  const cleanupKeyBinds = () => {
    document.removeEventListener('keydown', handleKeyDown);
  };

  onMounted(() => {
    initializeKeyBinds();
  });

  onUnmounted(() => {
    cleanupKeyBinds();
  });

  return {
    keyBindCategories: computed(() => keyBindCategories.value),
    isRecording: computed(() => isRecording.value),
    updateKeybind,
    resetKeybind,
    resetAllKeybinds,
    recordKeybind,
    getCurrentKey,
    parseKey,
    formatKeyForDisplay,
    isMac
  };
}