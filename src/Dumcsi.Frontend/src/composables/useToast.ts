import {readonly, ref} from 'vue';
import {useAppStore} from '@/stores/app';
import {UserStatus} from '@/services/types';
import {useNotificationPrefs} from '@/stores/notifications';
import { playChime } from '@/utils/sounds';

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
    // Optional: which notification category's preferences to apply for sound/browser
    notificationCategory?: 'server' | 'dm' | 'toast';
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

    // After showing UI toast, also trigger sound per global notification prefs
    try {
        // Load global notification prefs (avoid importing store to prevent circular deps)
        const RAW_KEY = 'dumcsi:notification-prefs:v1';
        const raw = localStorage.getItem(RAW_KEY);
        const defaults = {
            browser: { enabled: false, respectDnd: true },
            categories: {
                server: { enabled: true, playSound: true, volume: 0.8, respectDnd: true },
                dm: { enabled: true, playSound: true, volume: 0.9, respectDnd: true },
                toast: { enabled: true, playSound: false, volume: 0.5, respectDnd: true },
            }
        } as const;
        const cfg = raw ? { ...defaults, ...(JSON.parse(raw) || {}) } : defaults;
        const category = payload.notificationCategory || 'toast';
        const c = (cfg as any).categories?.[category] || (defaults as any).categories.toast;

        // DND handling for this category
        const isDnd = appStore.selfStatus === UserStatus.Busy;
        const suppressForDnd = !!c?.respectDnd && isDnd;

        // Play sound if enabled and not suppressed
        if (!suppressForDnd && c?.enabled && c?.playSound) {
            try {
                const tone = (category === 'dm' ? 'dm' : (category === 'server' ? 'server' : 'toast')) as any;
                // Fire and forget
                void playChime(tone, Number(c?.volume ?? 0.8));
            } catch {}
        }
    } catch {}
};

export function useToast() {
    return {
        toasts: readonly(toasts),
        addToast,
        removeToast,
    };
}
