import type { OrderStatus, PaymentType } from '@/types/checkout'

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}
export function orderStatusClass(status: OrderStatus) {
  return {
    PENDING: 'bg-amber-50 text-amber-800',
    PROCESSING: 'bg-blue-50 text-blue-800',
    COMPLETED: 'bg-emerald-50 text-emerald-800',
    CANCELLED: 'bg-rose-50 text-rose-800',
  }[status]
}
export function orderStatusDescription(status: OrderStatus, paymentType: PaymentType) {
  if (status === 'PENDING') return 'Pending — pay on delivery.'
  if (status === 'PROCESSING') return 'Processing — your order is being prepared.'
  if (status === 'CANCELLED') return 'Cancelled — purchased quantities have been returned to stock.'
  return paymentType === 'SIMULATED_CARD'
    ? 'Completed — simulated card payment.'
    : 'Completed — payment on delivery recorded.'
}
