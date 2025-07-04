import { ref } from 'vue';

const activeCloseCallback = ref<(() => void) | null>(null);

export function useContextMenuManager() {
  const setActiveMenu = (closeCallback: () => void) => {
    if (activeCloseCallback.value) { // TODO: check if the previous callback is still valid
      activeCloseCallback.value();
    }
    activeCloseCallback.value = closeCallback; // TODO: singleton anti-pattern, consider using a more flexible approach
  };

  const clearActiveMenu = () => {
    activeCloseCallback.value = null; // TODO: race condition, ensure that this is called only when the menu is actually closed
  };

  return {
    setActiveMenu,
    clearActiveMenu,
  };
}