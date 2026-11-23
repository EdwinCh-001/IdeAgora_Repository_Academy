import { apiClient } from '../../../shared/api/api-client'
import type {
  AuthSession,
  RegisterUserPayload,
  RegistrationOptions,
} from '../types/auth-types'

export const authApi = {
  async login(credentials: {
    email: string
    password: string
  }): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>(
      '/auth/login',
      credentials,
    )
    return response.data
  },

  async refresh(): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>('/auth/refresh')
    return response.data
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/logout')
    return response.data
  },

  async getRegistrationOptions(email: string): Promise<RegistrationOptions> {
    const response = await apiClient.get<RegistrationOptions>(
      '/auth/registration-options',
      { params: { email } },
    )
    return response.data
  },

  async register(payload: RegisterUserPayload): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/register',
      payload,
    )
    return response.data
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/verify-email',
      { token },
    )
    return response.data
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/resend-verification',
      { email },
    )
    return response.data
  },

  async acceptAdminInvitation(input: {
    token: string
    password: string
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/accept-admin-invitation',
      input,
    )
    return response.data
  },
}
