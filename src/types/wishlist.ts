import type { Product } from './catalog'

export interface WishlistItem {
  id: number
  product: Product
  createdAt: string
}

export interface AddToWishlistPayload {
  productId: number
}
