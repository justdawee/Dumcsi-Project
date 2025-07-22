import type { Directive } from 'vue';

/**
 * Directive to run a handler only when both mousedown and click events
 * originate from the backdrop element. This prevents unintended modal
 * closure when dragging or selecting text starting inside the modal
 * and releasing on the backdrop.
 */
const closeOnBackdrop: Directive<HTMLElement, () => void> = {
    mounted(el, binding) {
        let startOnBackdrop = false;

        const onMouseDown = (e: MouseEvent) => {
            if (e.target === el) {
                startOnBackdrop = true;
            }
        };

        const onClick = (e: MouseEvent) => {
            if (e.target === el && startOnBackdrop) {
                binding.value?.();
            }
            startOnBackdrop = false;
        };

        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('click', onClick);

        (el as any).__bdCleanup__ = () => {
            el.removeEventListener('mousedown', onMouseDown);
            el.removeEventListener('click', onClick);
        };
    },
    beforeUnmount(el: HTMLElement) {
        (el as any).__bdCleanup__?.();
    }
};

export default closeOnBackdrop;