import { ref } from 'vue';

const activeCloseCallback = ref<(() => void) | null>(null);

export function useContextMenuManager() {
  const setActiveMenu = (closeCallback: () => void) => {
    if (activeCloseCallback.value) {
      activeCloseCallback.value();
    }
    activeCloseCallback.value = closeCallback;
  };

  const clearActiveMenu = () => {
    activeCloseCallback.value = null;
  };

  return {
    setActiveMenu,
    clearActiveMenu,
  };
}