import { errorMessages } from '@/locales/en';

/**
 * Interface describing the expected structure of an API error from Axios.
 */
interface ApiError {
  response?: {
    data?: {
      error?: {
        code: string;
        message: string; // The original debug message from the backend
      };
    };
  };
  message: string; // The generic message from Axios (e.g., "Network Error")
}

/**
 * Translates an API error object into a user-friendly, displayable message.
 * @param error The error object, typically from an Axios catch block.
 * @returns A user-friendly string.
 */
export function getDisplayMessage(error: ApiError): string {
  // 1. Try to find a specific message using the error code from the backend response.
  const errorCode = error.response?.data?.error?.code;
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // 2. Check for a generic network error from Axios.
  if (error.message && error.message.includes('Network Error')) {
    return errorMessages['NETWORK_ERROR'];
  }
  
  // 3. As a last resort, log the technical details and return a generic error message.
  // This helps in debugging unhandled cases.
  console.error(
    'Unhandled API Error:', 
    error.response?.data?.error?.message || error.message
  );
  return errorMessages['UNKNOWN_ERROR'];
}
