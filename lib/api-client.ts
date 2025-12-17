// Improved API client with retry logic, validation, and proper error handling

import { z } from 'zod'

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

type FetchOptions = {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

/**
 * Fetch with retry logic and timeout
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 10000,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Don't retry on 4xx errors (client errors like 401, 404)
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // Retry on 5xx errors (server errors)
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error as Error

      // Don't retry on abort (timeout)
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout')
      }

      // If we have retries left and it's a network error, retry
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt) // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Type-safe API call with validation
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit & FetchOptions & { schema?: z.ZodSchema<T> } = {}
): Promise<ApiResponse<T>> {
  const { schema, ...fetchOptions } = options

  try {
    const response = await fetchWithRetry(url, fetchOptions)

    // Handle 401 gracefully (guest users)
    if (response.status === 401) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    // Validate response if schema provided
    if (schema) {
      const result = schema.safeParse(data)
      if (!result.success) {
        console.error('API response validation failed:', result.error)
        return {
          success: false,
          error: 'Invalid response format from server'
        }
      }
      return {
        success: true,
        data: result.data
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error(`API call failed: ${url}`, error)
    return {
      success: false,
      error: (error as Error).message || 'Network error'
    }
  }
}

/**
 * Wrapper for GET requests
 */
export async function apiGet<T>(
  url: string,
  options?: FetchOptions & { schema?: z.ZodSchema<T> }
): Promise<ApiResponse<T>> {
  return apiCall(url, {
    ...options,
    method: 'GET'
  })
}

/**
 * Wrapper for POST requests
 */
export async function apiPost<T>(
  url: string,
  body: any,
  options?: FetchOptions & { schema?: z.ZodSchema<T> }
): Promise<ApiResponse<T>> {
  return apiCall(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

/**
 * Wrapper for PUT requests
 */
export async function apiPut<T>(
  url: string,
  body: any,
  options?: FetchOptions & { schema?: z.ZodSchema<T> }
): Promise<ApiResponse<T>> {
  return apiCall(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

/**
 * Wrapper for DELETE requests
 */
export async function apiDelete<T>(
  url: string,
  options?: FetchOptions & { schema?: z.ZodSchema<T> }
): Promise<ApiResponse<T>> {
  return apiCall(url, {
    ...options,
    method: 'DELETE'
  })
}
