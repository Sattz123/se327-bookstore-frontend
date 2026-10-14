import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { WishlistService } from '@/services/WishlistService'
import type { WishlistItem } from '@/types/wishlist'
import type { Product } from '@/types/catalog'

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref<WishlistItem[]>([])
  const isLoading = ref(false)
  const error = ref('')
  let requestId = 0
  let session = 0

  const count = computed(() => (Array.isArray(items.value) ? items.value.length : 0))
  const savedProductIds = computed(
    () => new Set((Array.isArray(items.value) ? items.value : []).map((i) => i.product?.id)),
  )

  function hasItem(productId: number): boolean {
    return savedProductIds.value.has(productId)
  }

  async function fetchWishlist(): Promise<void> {
    const request = ++requestId
    isLoading.value = true
    error.value = ''
    try {
      const data = await WishlistService.getWishlist()
      if (request === requestId) items.value = Array.isArray(data) ? data : []
    } catch {
      if (request === requestId) error.value = 'Unable to load your wishlist. Please try again.'
    } finally {
      if (request === requestId) isLoading.value = false
    }
  }

  async function addToWishlist(product: Product): Promise<void> {
    if (hasItem(product.id)) return
    const account = session
    const newItem = await WishlistService.addToWishlist({ productId: product.id })
    if (account !== session) return
    const refresh = isLoading.value
    ++requestId
    isLoading.value = false
    error.value = ''
    // Ensure product object is preserved
    const entry: WishlistItem = {
      ...newItem,
      product: newItem.product || product,
    }
    items.value = [entry, ...items.value]
    if (refresh) await fetchWishlist()
  }

  async function removeFromWishlist(productId: number): Promise<void> {
    const account = session
    await WishlistService.removeFromWishlist(productId)
    if (account !== session) return
    const refresh = isLoading.value
    ++requestId
    isLoading.value = false
    error.value = ''
    items.value = items.value.filter((i) => i.product.id !== productId)
    if (refresh) await fetchWishlist()
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
    ++session
    ++requestId
    items.value = []
    isLoading.value = false
    error.value = ''
  }

  return {
    items,
    isLoading,
    error,
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
