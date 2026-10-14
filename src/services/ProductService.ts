import apiClient from '@/services/apiClient'
import type { Product } from '@/types/catalog'

export default {
  getProducts(signal?: AbortSignal) {
    return apiClient.get<Product[]>('/products', { signal })
  },
  getProduct(id: string, signal?: AbortSignal) {
    return apiClient.get<Product>(`/products/${encodeURIComponent(id)}`, { signal })
  },
}
