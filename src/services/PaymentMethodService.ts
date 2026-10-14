import apiClient from './apiClient'
import type { PaymentMethod, PaymentMethodPayload } from '@/types/paymentMethod'

export const PaymentMethodService = {
  async getPaymentMethods(signal?: AbortSignal): Promise<PaymentMethod[]> {
    return (await apiClient.get<PaymentMethod[]>('/payment-methods', { signal })).data
  },
  async addPaymentMethod(payload: PaymentMethodPayload): Promise<PaymentMethod> {
    return (await apiClient.post<PaymentMethod>('/payment-methods', payload)).data
  },
  async setDefault(id: number): Promise<PaymentMethod> {
    return (await apiClient.put<PaymentMethod>(`/payment-methods/${id}/default`)).data
  },
  async deletePaymentMethod(id: number): Promise<void> {
    await apiClient.delete(`/payment-methods/${id}`)
  },
}
