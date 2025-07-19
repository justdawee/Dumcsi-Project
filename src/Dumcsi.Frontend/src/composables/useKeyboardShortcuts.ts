import {onMounted, onUnmounted, ref, watch, isRef, type Ref} from 'vue';
import {readonly} from 'vue';

interface Shortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: (event: KeyboardEvent) => void;
    captureInput?: boolean;
}

// Type for the target of the keyboard shortcuts.
// It can be a Ref to an HTMLElement, an HTMLElement directly, or the Window object.
type ShortcutTarget = Ref<HTMLElement | null> | HTMLElement | Window;

export function useKeyboardShortcuts(shortcuts: Shortcut[], target: ShortcutTarget = window) {
    const isListening = ref(false);

    const handleKeyDown = (event: KeyboardEvent) => {
        // If the event handler is not active, do nothing.
        if (!isListening.value) return;

        const eventTarget = event.target as HTMLElement;

        // Helper function to check if the modifier matches the expected value.
        const matchesModifier = (actual: boolean, expected?: boolean) => {
            return expected === undefined || expected === actual;
        };

        // Search for a matching shortcut
        const matchedShortcut = shortcuts.find(shortcut =>
            shortcut.key.toLowerCase() === event.key.toLowerCase() &&
            matchesModifier(event.ctrlKey || event.metaKey, shortcut.ctrl) &&
            matchesModifier(event.shiftKey, shortcut.shift) &&
            matchesModifier(event.altKey, shortcut.alt)
        );

        if (matchedShortcut) {
            // By default, we prevent the command from running if the user is typing.
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(eventTarget.tagName) || eventTarget.isContentEditable;

            if (isTyping && !matchedShortcut.captureInput) {
                return; // Do not run the handler if the user is typing and the command is not "captureInput".
            }

            event.preventDefault();
            matchedShortcut.handler(event);
        }
    };

    const getElement = (): HTMLElement | Window | null => {
        const el = isRef(target) ? target.value : target;
        return el ?? null;
    };


    const start = () => {
        const el = getElement();
        if (el && !isListening.value) {
            el.addEventListener('keydown', handleKeyDown as EventListener);
            isListening.value = true;
        }
    };

    const stop = () => {
        const el = getElement();
        if (el && isListening.value) {
            el.removeEventListener('keydown', handleKeyDown as EventListener);
            isListening.value = false;
        }
    };

    if (isRef(target)) {
        watch(target, (newTarget, oldTarget) => {
            if (newTarget !== oldTarget && oldTarget != null) {
                stop();
                start();
            }
        });
    }

    onMounted(start);
    onUnmounted(stop);

    return {
        start,
        stop,
        isListening: readonly(isListening),
    };
}

// Usage example:
//**
//   const { start, stop, isListening } = useKeyboardShortcuts([
//     {
//       key: 'Enter',
//       ctrl: true,
//       handler: (event) => {
//         console.log('Ctrl + Enter pressed');
//       },
//     },
//     {
//       key: 'Escape',
//       handler: (event) => {
//         console.log('Escape pressed');
//       },
//     },
//   ], document.getElementById('myElement'));
//
//   start(); // Start listening for shortcuts
//   stop(); // Stop listening for shortcuts
//   isListening.value; // Check if shortcuts are currently being listened to
//   Note: Ensure that the target element is focusable and can receive keyboard events.
// */