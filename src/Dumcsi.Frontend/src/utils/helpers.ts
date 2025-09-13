import type {ISODateString} from '@/services/types';
import { i18n } from '@/i18n';

/**
 * Formats a date string or object into a user-friendly, relative format.
 * Examples: "Today", "Yesterday", "Wednesday", "Oct 27", "Oct 27, 2022".
 * @param dateInput The date to format, as an ISODateString or a Date object.
 * @returns A formatted string representation of the date.
 */
export const formatDate = (dateInput: ISODateString | Date): string => {
    const date = new Date(dateInput);
    const now = new Date();

    // To calculate the difference in days, we compare dates at midnight.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = startOfToday.getTime() - startOfDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Resolve current locale from vue-i18n
    const currentLocale = (() => {
        try {
            const l: any = (i18n.global as any).locale;
            return typeof l === 'string' ? l : l?.value || 'en-US';
        } catch { return 'en-US'; }
    })();

    if (diffDays === 0) {
        // Today
        return i18n.global.t('dates.today') as unknown as string;
    }
    if (diffDays === 1) {
        // Yesterday
        return i18n.global.t('dates.yesterday') as unknown as string;
    }
    if (diffDays > 1 && diffDays < 7) {
        return date.toLocaleDateString(currentLocale, {weekday: 'long'});
    }

    // Pre-calculate options for toLocaleDateString
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
    };

    if (date.getFullYear() !== now.getFullYear()) {
        options.year = 'numeric';
    }

    return date.toLocaleDateString(currentLocale, options);
};

/**
 * Formats a date string or object into a simple time format (e.g., "14:30").
 * @param dateInput The date to format.
 * @returns A formatted string representation of the time.
 */
export const formatTime = (dateInput: ISODateString | Date): string => {
    const date = new Date(dateInput);
    const currentLocale = (() => {
        try {
            const l: any = (i18n.global as any).locale;
            return typeof l === 'string' ? l : l?.value || 'en-US';
        } catch { return 'en-US'; }
    })();
    return date.toLocaleTimeString(currentLocale, {
        hour: 'numeric',
        minute: '2-digit',
        // Let locale decide 12/24h
    });
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns The new debounced function.
 */
export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Generates initials from a name string.
 * @param name The name to generate initials from.
 * @returns A 1 or 2 character string of initials.
 */
export const getUserInitials = (name: string): string => {
    if (!name) return '';
    return name
        .trim()
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Validates an email address against a robust regular expression.
 * @param email The email string to validate.
 * @returns `true` if the email is valid, otherwise `false`.
 */
export const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    // This regex is a good balance between accuracy and performance for client-side validation.
    const emailRegex = new RegExp(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
    return emailRegex.test(String(email).toLowerCase());
};

/**
 * Generates a consistent color from a string (e.g., for default avatars).
 * @param name The input string to hash.
 * @returns A hex color code string.
 */
export const generateAvatarColor = (name: string): string => {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
    ];

    let hash = 0;
    if (name.length === 0) return colors[0];
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return colors[Math.abs(hash) % colors.length];
};

/**
 * Truncates a string to a specified length and appends an ellipsis.
 * @param text The text to truncate.
 * @param length The maximum length of the text.
 * @returns The truncated text.
 */
export const truncate = (text: string, length = 50): string => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

/**
 * Copies a string to the user's clipboard.
 * @param text The text to copy.
 * @returns A promise that resolves to `true` on success and `false` on failure.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text to clipboard:', err);
        return false;
    }
};

/**
 * Format a file size in bytes to a human readable string.
 */
export const formatFileSize = (size: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    let s = size;
    while (s >= 1024 && idx < units.length - 1) {
        s /= 1024;
        idx++;
    }
    return `${s.toFixed(1)} ${units[idx]}`;
};
