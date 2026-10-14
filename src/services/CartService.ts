import apiClient from './apiClient'
import type { AddToCartPayload, Cart } from '@/types/cart'

export const CartService = {
  async getCart(signal?: AbortSignal): Promise<Cart> {
    return (await apiClient.get<Cart>('/cart', { signal })).data
  },
  async addItem(payload: AddToCartPayload): Promise<Cart> {
    return (await apiClient.post<Cart>('/cart/items', payload)).data
  },
  async updateQuantity(id: number, quantity: number): Promise<Cart> {
    return (await apiClient.put<Cart>(`/cart/items/${id}`, { quantity })).data
  },
  async removeItem(id: number): Promise<Cart> {
    return (await apiClient.delete<Cart>(`/cart/items/${id}`)).data
  },
}
