import { errorMessages } from '@/locales/en'

export interface ApiError {
  code?: string
  message?: string
  response?: {
    data?: {
      message?: string
      code?: string
    }
  }
}

export const getDisplayMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred'

  // If it's an API error with a backend error code
  if (error.response?.data?.message) {
    const backendMessage = error.response.data.message
    const backendCode = error.response.data.code
    
    // Try to find a localized message for the backend code
    if (backendCode && errorMessages[backendCode]) {
      return errorMessages[backendCode]
    }
    
    // If no localized message, try to find one by the backend message
    const messageKey = Object.keys(errorMessages).find(key => 
      backendMessage.includes(key)
    )
    
    if (messageKey && errorMessages[messageKey]) {
      return errorMessages[messageKey]
    }
    
    // Return the backend message as-is if no localization found
    return backendMessage
  }

  // If it's a frontend error with a message
  if (error.message) {
    return error.message
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR') {
    return 'Network error. Please check your connection.'
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.'
  }

  return 'An unexpected error occurred'
}

export const handleError = (error: any, defaultMessage: string = 'An error occurred'): string => {
  console.error('Error occurred:', error)
  return getDisplayMessage(error) || defaultMessage
}