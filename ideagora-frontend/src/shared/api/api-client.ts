import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { AuthSession } from '../../features/auth/types/auth-types'

let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const request = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined
    if (!request || request._retry || request.url?.startsWith('/auth/')) {
      return Promise.reject(error)
    }

    request._retry = true
    refreshPromise ??= apiClient
      .post<AuthSession>('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })

    try {
      const refreshedToken = await refreshPromise
      request.headers.Authorization = `Bearer ${refreshedToken}`
      return apiClient(request)
    } catch (refreshError) {
      setAccessToken(null)
      return Promise.reject(refreshError)
    }
  },
)

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(' ')
    if (message) return message
  }

  return fallback
}
