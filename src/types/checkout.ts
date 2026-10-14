import type { Cart } from './cart'
import type { BookFormat } from './catalog'

export type PaymentType = 'CASH_ON_DELIVERY' | 'SIMULATED_CARD'
export interface CheckoutReview {
  cart: Cart
  cartFingerprint: string
}
export interface CheckoutPayload {
  addressId: number
  paymentType: PaymentType
  paymentMethodId: number | null
  checkoutKey: string
  cartFingerprint: string
}
export interface Order {
  id: number
  status: 'PENDING' | 'COMPLETED'
  paymentType: PaymentType
  paymentDisplay: string
  recipientName: string
  shippingPhone: string | null
  shippingAddress: string
  total: number
  createdAt: string
  items: {
    productId: number
    title: string
    format: BookFormat
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
}
