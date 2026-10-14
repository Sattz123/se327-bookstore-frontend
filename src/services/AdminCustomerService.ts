import apiClient from './apiClient'

export interface AdminCustomer {
  id: number
  username: string
  email: string
  phone: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
}
export interface AdminCustomerPage {
  content: AdminCustomer[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export const AdminCustomerService = {
  async list(q: string, page: number, signal?: AbortSignal): Promise<AdminCustomerPage> {
    return (
      await apiClient.get<AdminCustomerPage>('/admin/customers', { params: { q, page }, signal })
    ).data
  },
}
