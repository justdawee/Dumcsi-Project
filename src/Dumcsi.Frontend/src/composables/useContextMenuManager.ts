import {ref, readonly} from 'vue';

interface ActiveMenu {
    id: number;
    close: () => void;
}

const activeMenus = ref<ActiveMenu[]>([]);

let menuIdCounter = 0;

export function useContextMenuManager() {
    const openMenu = (closeCallback: () => void): number => {
        try {
            activeMenus.value.forEach(menu => menu.close());
        } catch (e) {
            console.error("Error occurred while closing a previous menu:", e);
        }

        // Empty the activeMenus array before opening a new one
        activeMenus.value = [];

        const menuId = menuIdCounter++;
        activeMenus.value.push({id: menuId, close: closeCallback});

        return menuId;
    };

    const closeMenu = (menuId: number) => {
        const index = activeMenus.value.findIndex(menu => menu.id === menuId);
        if (index !== -1) {
            try {
                activeMenus.value[index].close();
            } catch (e) {
                console.error(`Error occurred while closing menu with ID ${menuId}:`, e);
            } finally {
                // Always remove the menu from the list, even if 'close' throws an error.
                activeMenus.value.splice(index, 1);
            }
        }
    };

    return {
        openMenu,
        closeMenu,
        activeMenus: readonly(activeMenus),
    };
}