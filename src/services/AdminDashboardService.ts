import apiClient from './apiClient'
import type { AdminOrderSummary } from './AdminOrderService'

export interface AdminDashboard {
  totalProducts: number
  totalOrders: number
  totalCustomers: number
  recentOrders: AdminOrderSummary[]
  page: number
  size: number
  totalPages: number
}
export const AdminDashboardService = {
  async get(page: number, signal?: AbortSignal): Promise<AdminDashboard> {
    return (await apiClient.get<AdminDashboard>('/admin/dashboard', { params: { page }, signal }))
      .data
  },
}
