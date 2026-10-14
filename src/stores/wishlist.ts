import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { WishlistService } from '@/services/WishlistService'
import type { WishlistItem } from '@/types/wishlist'
import type { Product } from '@/types/catalog'

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref<WishlistItem[]>([])
  const isLoading = ref(false)

  const count = computed(() => items.value.length)
  const savedProductIds = computed(() => new Set(items.value.map((i) => i.product.id)))

  function hasItem(productId: number): boolean {
    return savedProductIds.value.has(productId)
  }

  async function fetchWishlist(): Promise<void> {
    isLoading.value = true
    try {
      items.value = await WishlistService.getWishlist()
    } catch {
      // In case of error (e.g. unauthenticated or network), keep items as-is
    } finally {
      isLoading.value = false
    }
  }

  async function addToWishlist(product: Product): Promise<void> {
    if (hasItem(product.id)) return

    const newItem = await WishlistService.addToWishlist({ productId: product.id })
    // Ensure product object is preserved
    const entry: WishlistItem = {
      ...newItem,
      product: newItem.product || product,
    }
    items.value = [entry, ...items.value]
  }

  async function removeFromWishlist(productId: number): Promise<void> {
    await WishlistService.removeFromWishlist(productId)
    items.value = items.value.filter((i) => i.product.id !== productId)
  }

  async function toggleWishlist(product: Product): Promise<boolean> {
    if (hasItem(product.id)) {
      await removeFromWishlist(product.id)
      return false
    } else {
      await addToWishlist(product)
      return true
    }
  }

  function clear(): void {
    items.value = []
  }

  return {
    items,
    isLoading,
    count,
    savedProductIds,
    hasItem,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clear,
  }
})
