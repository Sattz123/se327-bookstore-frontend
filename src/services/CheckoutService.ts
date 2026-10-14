import apiClient from './apiClient'
import type { CheckoutPayload, CheckoutReview, Order } from '@/types/checkout'

export const CheckoutService = {
  async review(signal?: AbortSignal): Promise<CheckoutReview> {
    return (await apiClient.get<CheckoutReview>('/checkout/review', { signal })).data
  },
  async placeOrder(payload: CheckoutPayload): Promise<Order> {
    return (await apiClient.post<Order>('/checkout', payload)).data
  },
  async confirmation(id: string, signal?: AbortSignal): Promise<Order> {
    return (await apiClient.get<Order>(`/checkout/orders/${id}`, { signal })).data
  },
}
