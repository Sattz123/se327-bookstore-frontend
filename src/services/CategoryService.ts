import apiClient from '@/services/apiClient'
import type { Category } from '@/types/catalog'

export default {
  getCategories(signal?: AbortSignal) {
    return apiClient.get<Category[]>('/categories', { signal })
  },
}
