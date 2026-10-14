export interface PaymentMethodPayload {
  provider: string
  cardholderName: string
  lastFour: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

export interface PaymentMethod extends Omit<PaymentMethodPayload, 'lastFour'> {
  id: number
  cardNumberMasked: string
  createdAt: string
}
