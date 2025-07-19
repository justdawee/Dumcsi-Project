import {errorMessages} from '@/locales/en';
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
    // Handle string errors (thrown from services)
    if (typeof error === 'string') {
        return error;
    }

    // Handle Error objects with just a message
    if (error instanceof Error && !('response' in error)) {
        // Check for network errors
        if (error.message && error.message.includes('Network Error')) {
            return errorMessages['NETWORK_ERROR'];
        }
        return error.message || errorMessages['UNKNOWN_ERROR'];
    }

    // Handle Axios errors with response
    const axiosError = error as AxiosError<ApiErrorResponseData>;

    // 1. Try to get error code from the new ApiResponse format
    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const responseData = axiosError.response.data;

        // Check if it's an ApiResponse with error property
        if ('error' in responseData && responseData.error) {
            const errorCode = responseData.error.code;
            if (errorCode && errorMessages[errorCode]) {
                return errorMessages[errorCode];
            }
            // Return the backend error message if no translation found
            return responseData.error.message || errorMessages['UNKNOWN_ERROR'];
        }

        // Check if it's an ApiResponse with just a message (shouldn't happen for errors, but just in case)
        if ('isSuccess' in responseData && !responseData.isSuccess && 'message' in responseData) {
            return responseData.message || errorMessages['UNKNOWN_ERROR'];
        }
    }

    // 2. Handle HTTP status code errors
    if (axiosError.response?.status) {
        switch (axiosError.response.status) {
            case 401:
                return errorMessages['AUTH_INVALID_CREDENTIALS'];
            case 403:
                return errorMessages['FORBIDDEN'];
            case 404:
                return errorMessages['RESOURCE_NOT_FOUND'];
            case 400:
                return errorMessages['INVALID_REQUEST'];
            case 500:
            case 502:
            case 503:
                return errorMessages['UNKNOWN_ERROR'];
        }
    }

    // 3. Check for network errors from Axios
    if (axiosError.message && axiosError.message.includes('Network Error')) {
        return errorMessages['NETWORK_ERROR'];
    }

    // 4. Log unhandled error for debugging
    console.error('Unhandled API Error:', error);

    // 5. Return generic error message
    return errorMessages['UNKNOWN_ERROR'];
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