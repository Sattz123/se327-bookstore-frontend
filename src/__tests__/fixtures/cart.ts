import type { Cart, CartItem } from '@/types/cart'
import type { User } from '@/types/auth'

export const cartReader: User = {
  id: 1,
  username: 'Cart Reader',
  email: 'cart@example.com',
  phone: null,
  avatarUrl: null,
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00Z',
}
export const cartLine: CartItem = {
  id: 10,
  productId: 1,
  name: 'The Great Gatsby',
  image: null,
  format: 'PAPERBACK',
  quantity: 2,
  unitPrice: 19.95,
  lineTotal: 39.9,
  stockQuantity: 7,
  available: true,
}
export function savedCart(items: CartItem[] = [cartLine]): Cart {
  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    total: Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)),
  }
}
