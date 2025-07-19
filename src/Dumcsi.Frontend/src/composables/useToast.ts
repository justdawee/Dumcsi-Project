import {readonly, ref} from 'vue';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

// ToastMessage interface defines the structure of a toast message
export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
    title?: string;
}

// Payload for adding a toast message
export interface AddToastPayload {
    message: string;
    type?: ToastType;
    title?: string;
    duration?: number;
}

const toasts = ref<ToastMessage[]>([]);

const removeToast = (id: number) => {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index > -1) {
        toasts.value.splice(index, 1);
    }
};

const addToast = (payload: AddToastPayload) => {
    const {message, type = 'info', title, duration = 3000} = payload;
    const id = Date.now() + Math.random(); // Random ID based on timestamp and random number

    toasts.value.push({id, message, type, title});

    setTimeout(() => {
        removeToast(id);
    }, duration);
};

export function useToast() {
    return {
        toasts: readonly(toasts),
        addToast,
        removeToast,
    };
}