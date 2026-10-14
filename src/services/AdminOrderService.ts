import apiClient from './apiClient'
import type { Order, OrderStatus } from '@/types/checkout'

export interface AdminOrderSummary {
  id: number
  customerId: number
  customerName: string
  customerEmail: string
  status: OrderStatus
  paymentDisplay: string
  total: number
  createdAt: string
}
export interface AdminOrderPage {
  content: AdminOrderSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export interface AdminOrderDetail {
  order: Order
  customerId: number
  customerName: string
  customerEmail: string
  customerPhone: string | null
  version: number
  updatedAt: string
  allowedStatuses: OrderStatus[]
}
export const AdminOrderService = {
  async list(
    params: { q: string; status?: OrderStatus; page: number },
    signal?: AbortSignal,
  ): Promise<AdminOrderPage> {
    return (await apiClient.get<AdminOrderPage>('/admin/orders', { params, signal })).data
  },
  async get(id: string, signal?: AbortSignal): Promise<AdminOrderDetail> {
    return (await apiClient.get<AdminOrderDetail>(`/admin/orders/${id}`, { signal })).data
  },
  async updateStatus(id: number, status: OrderStatus, version: number): Promise<AdminOrderDetail> {
    return (
      await apiClient.patch<AdminOrderDetail>(`/admin/orders/${id}/status`, { status, version })
    ).data
  },
}
