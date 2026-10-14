import apiClient from './apiClient'
import type { AuthResponse, ChangePasswordPayload, UpdateProfilePayload, User } from '@/types/auth'

export const ProfileService = {
  async getProfile(signal?: AbortSignal): Promise<User> {
    const response = await apiClient.get<User>('/profile', { signal })
    return response.data
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthResponse> {
    const response = await apiClient.put<AuthResponse>('/profile', payload)
    return response.data
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>('/profile/password', payload)
    return response.data
  },
}
