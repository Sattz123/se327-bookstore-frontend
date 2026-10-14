import type { Address } from '@/types/address'
import type { PaymentMethod } from '@/types/paymentMethod'
import type { CheckoutReview, Order } from '@/types/checkout'
import { savedCart } from './cart'

export const delivery: Address = {
  id: 10,
  label: 'Home',
  fullName: 'Demo Reader',
  phone: null,
  addressLine: '123 Test Street',
  city: 'Chiang Mai',
  province: null,
  postalCode: '50200',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}
export const simulatedCard: PaymentMethod = {
  id: 20,
  provider: 'Visa',
  cardholderName: 'Demo Reader',
  cardNumberMasked: '**** **** **** 1234',
  expiryMonth: 12,
  expiryYear: 2030,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
}
export const checkoutReview: CheckoutReview = { cart: savedCart(), cartFingerprint: 'a'.repeat(64) }
export const placedOrder: Order = {
  id: 41,
  status: 'PENDING',
  paymentType: 'CASH_ON_DELIVERY',
  paymentDisplay: 'Cash on delivery',
  recipientName: 'Demo Reader',
  shippingPhone: null,
  shippingAddress: '123 Test Street\nChiang Mai\n50200',
  total: 39.9,
  createdAt: '2026-01-01T00:00:00Z',
  items: [
    {
      productId: 1,
      title: 'The Great Gatsby',
      format: 'PAPERBACK',
      quantity: 2,
      unitPrice: 19.95,
      lineTotal: 39.9,
    },
  ],
}
