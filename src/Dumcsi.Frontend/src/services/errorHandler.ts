import { i18n } from '@/i18n';
import type {AxiosError} from 'axios';
import type {ApiResponse} from './api';

/**
 * Interface for the error payload in ApiResponse
 */
interface ApiErrorPayload {
    code: string;
    message: string;
}

/**
 * Type for API error response data
 */
type ApiErrorResponseData = ApiResponse<any> | {
    error?: ApiErrorPayload;
};

/**
 * Translates an error into a user-friendly displayable message.
 * Handles both new ApiResponse format and legacy error formats.
 * @param error The error object, typically from an Axios catch block or thrown from services
 * @returns A user-friendly string.
 */
export function getDisplayMessage(error: any): string {
    const tr: any = i18n.global;
    const codeKey = (code: string) => `errors.codes.${code}`;
    const tCode = (code: string): string | null => {
        try {
            if (tr.te(codeKey(code))) {
                return tr.t(codeKey(code)) as unknown as string;
            }
        } catch {}
        return null;
    };
    const tUnknown = () => {
        try { return tr.t('errors.unknown') as unknown as string; } catch { return 'An unknown error occurred.'; }
    };
    const tNetwork = () => {
        return tCode('NETWORK_ERROR') || (tr.t ? tr.t('errors.network') : 'Network error occurred');
    };
    // Handle string errors (thrown from services)
    if (typeof error === 'string') {
        return error;
    }

    // Handle Error objects with just a message
    if (error instanceof Error && !('response' in error)) {
        // Check for network errors
        if (error.message && error.message.includes('Network Error')) {
            return tNetwork();
        }
        return error.message || tUnknown();
    }

    // Handle Axios errors with response
    const axiosError = error as AxiosError<ApiErrorResponseData>;

    // 1. Try to get error code from the new ApiResponse format
    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const responseData = axiosError.response.data;

        // Check if it's an ApiResponse with error property
        if ('error' in responseData && responseData.error) {
            const errorCode = responseData.error.code;
            if (errorCode) {
                const translated = tCode(errorCode);
                if (translated) return translated;
            }
            // Return the backend error message if no translation found
            return responseData.error.message || tUnknown();
        }

        // Check if it's an ApiResponse with just a message (shouldn't happen for errors, but just in case)
        if ('isSuccess' in responseData && !responseData.isSuccess && 'message' in responseData) {
            return responseData.message || tUnknown();
        }
    }

    // 2. Handle HTTP status code errors
    if (axiosError.response?.status) {
        switch (axiosError.response.status) {
            case 401:
                return tCode('AUTH_INVALID_CREDENTIALS') || tUnknown();
            case 403:
                return tCode('FORBIDDEN') || tUnknown();
            case 404:
                return tCode('RESOURCE_NOT_FOUND') || tUnknown();
            case 400:
                return tCode('INVALID_REQUEST') || tUnknown();
            case 500:
            case 502:
            case 503:
                return tUnknown();
        }
    }

    // 3. Check for network errors from Axios
    if (axiosError.message && axiosError.message.includes('Network Error')) {
        return tNetwork();
    }

    // 4. Log unhandled error for debugging
    console.error('Unhandled API Error:', error);

    // 5. Return generic error message
    return tUnknown();
}

/**
 * Extract error code from an error object if available
 * @param error The error object
 * @returns The error code or null
 */
export function getErrorCode(error: any): string | null {
    if (!error || typeof error !== 'object') return null;

    const axiosError = error as AxiosError<ApiErrorResponseData>;
    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const responseData = axiosError.response.data;
        if ('error' in responseData && responseData.error?.code) {
            return responseData.error.code;
        }
    }

    return null;
}

/**
 * Check if error is a specific error code
 * @param error The error object
 * @param code The error code to check
 * @returns true if the error matches the code
 */
export function isErrorCode(error: any, code: string): boolean {
    return getErrorCode(error) === code;
}
