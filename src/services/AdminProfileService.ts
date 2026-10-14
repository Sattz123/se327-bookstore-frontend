import apiClient from './apiClient'
import type { AuthResponse, ChangePasswordPayload, UpdateProfilePayload, User } from '@/types/auth'

export const AdminProfileService = {
  async get(signal?: AbortSignal): Promise<User> {
    return (await apiClient.get<User>('/admin/profile', { signal })).data
  },
  async update(payload: UpdateProfilePayload): Promise<AuthResponse> {
    return (await apiClient.put<AuthResponse>('/admin/profile', payload)).data
  },
  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    return (await apiClient.put<{ message: string }>('/admin/profile/password', payload)).data
  },
}
