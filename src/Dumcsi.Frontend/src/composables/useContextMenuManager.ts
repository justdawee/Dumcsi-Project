import { ref, readonly } from 'vue';

let menuIdCounter = 0;

interface ActiveMenu {
  id: number;
  close: () => void;
}

const activeMenus = ref<ActiveMenu[]>([]);

export function useContextMenuManager() {
  const openMenu = (closeCallback: () => void): number => {
    activeMenus.value.forEach(menu => menu.close());
    activeMenus.value = [];

    const menuId = menuIdCounter++;
    activeMenus.value.push({ id: menuId, close: closeCallback });

    return menuId;
  };

  const closeMenu = (menuId: number) => {
    const index = activeMenus.value.findIndex(menu => menu.id === menuId);
    if (index !== -1) {
      activeMenus.value[index].close();
      activeMenus.value.splice(index, 1);
    }
  };

  return {
    openMenu,
    closeMenu,
    activeMenus: readonly(activeMenus),
  };
}