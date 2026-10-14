import apiClient from './apiClient'
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
  VerifyResetTokenResponse,
} from '@/types/auth'

export const AuthService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload)
    return response.data
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload)
    return response.data
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore network errors during logout
    }
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', payload)
    return response.data
  },

  async verifyResetToken(token: string): Promise<VerifyResetTokenResponse> {
    const response = await apiClient.get<VerifyResetTokenResponse>('/auth/verify-reset-token', {
      params: { token },
    })
    return response.data
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', payload)
    return response.data
  },
}
