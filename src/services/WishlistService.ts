import apiClient from './apiClient'
import type { AddToWishlistPayload, WishlistItem } from '@/types/wishlist'

export const WishlistService = {
  async getWishlist(): Promise<WishlistItem[]> {
    const response = await apiClient.get<WishlistItem[]>('/wishlist')
    return response.data
  },

  async addToWishlist(payload: AddToWishlistPayload): Promise<WishlistItem> {
    const response = await apiClient.post<WishlistItem>('/wishlist', payload)
    return response.data
  },

  async removeFromWishlist(productId: number): Promise<void> {
    await apiClient.delete(`/wishlist/${productId}`)
  },
}
