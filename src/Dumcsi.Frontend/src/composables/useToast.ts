import {readonly, ref} from 'vue';
import {useAppStore} from '@/stores/app';
import {UserStatus} from '@/services/types';
import {useNotificationPrefs} from '@/stores/notifications';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

// ToastMessage interface defines the structure of a toast message
export interface ToastAction {
    label: string;
    action: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger';
}

export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
    title?: string;
    actions?: ToastAction[];
    // Optional click handler for the whole toast (e.g., navigate)
    onClick?: () => void | Promise<void>;
    // Optional DM quick-reply payload
    quickReply?: {
        placeholder?: string;
        onSend: (text: string) => void | Promise<void>;
    };
    // Optional metadata for future filtering/muting
    meta?: {
        serverId?: number;
        channelId?: number;
        dmUserId?: number;
    };
    // For UI: actual auto-dismiss duration in ms (0 => sticky)
    durationMs?: number;
}

// Payload for adding a toast message
export interface AddToastPayload {
    message: string;
    type?: ToastType;
    title?: string;
    duration?: number;
    actions?: ToastAction[];
    onClick?: () => void | Promise<void>;
    quickReply?: {
        placeholder?: string;
        onSend: (text: string) => void | Promise<void>;
    };
    meta?: {
        serverId?: number;
        channelId?: number;
        dmUserId?: number;
    };
}

const toasts = ref<ToastMessage[]>([]);

const removeToast = (id: number) => {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index > -1) {
        toasts.value.splice(index, 1);
    }
};

const addToast = (payload: AddToastPayload) => {
    const appStore = useAppStore();
    const prefs = useNotificationPrefs();

    // Respect Do Not Disturb (Busy) mode
    try {
        if (appStore.selfStatus === UserStatus.Busy) return;
    } catch {}

    // Future-proof: allow suppression via preferences (per-channel/DM)
    try {
        if (prefs.shouldSuppress(payload.meta)) return;
    } catch {}

    const {message, type = 'info', title, duration, actions, onClick, quickReply, meta} = payload;
    const id = Date.now() + Math.random(); // Random ID based on timestamp and random number

    toasts.value.push({id, message, type, title, actions, onClick, quickReply, meta, durationMs: 0});

    const ms = duration !== undefined ? duration : (
        (actions && actions.length > 0) || quickReply ? 0 : 3000
    );
    if (ms > 0) {
        // store for UI progress bar
        const idx = toasts.value.findIndex(t => t.id === id);
        if (idx !== -1) toasts.value[idx].durationMs = ms;
        setTimeout(() => {
            removeToast(id);
        }, ms);
    }
};

export function useToast() {
    return {
        toasts: readonly(toasts),
        addToast,
        removeToast,
    };
}
