import apiClient from '@/services/apiClient'
import type { Product, ProductPage, ProductQuery } from '@/types/catalog'

export default {
  getProducts(params: ProductQuery = {}, signal?: AbortSignal) {
    return apiClient.get<ProductPage>('/products', { params, signal })
  },
  getFeaturedProducts(signal?: AbortSignal) {
    return apiClient.get<Product[]>('/products/featured', { signal })
  },
  getProduct(id: string, signal?: AbortSignal) {
    return apiClient.get<Product>(`/products/${encodeURIComponent(id)}`, { signal })
  },
}
