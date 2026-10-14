import type { BookFormat } from './catalog'

export interface CartItem {
  id: number
  productId: number
  name: string
  image: string | null
  format: BookFormat
  quantity: number
  unitPrice: number
  lineTotal: number
  stockQuantity: number
  available: boolean
}
export interface Cart {
  items: CartItem[]
  totalQuantity: number
  total: number
}
export interface AddToCartPayload {
  productId: number
  format: BookFormat
  quantity: number
}
