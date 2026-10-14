import apiClient from './apiClient'
import type { Order } from '@/types/checkout'

export type OrderSummary = Pick<Order, 'id' | 'status' | 'paymentDisplay' | 'total' | 'createdAt'>

export const OrderService = {
  async getOrders(signal?: AbortSignal): Promise<OrderSummary[]> {
    return (await apiClient.get<OrderSummary[]>('/orders', { signal })).data
  },
  async getOrder(id: string, signal?: AbortSignal): Promise<Order> {
    return (await apiClient.get<Order>(`/orders/${id}`, { signal })).data
  },
}
