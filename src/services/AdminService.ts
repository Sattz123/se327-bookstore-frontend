import apiClient from './apiClient'
import type { User } from '@/types/auth'

export const AdminService = {
  async getSession(): Promise<User> {
    return (await apiClient.get<User>('/admin/session')).data
  },
}
