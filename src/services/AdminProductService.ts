import apiClient from './apiClient'
import type {
  AdminCategory,
  AdminProduct,
  AdminProductPage,
  AdminProductPayload,
} from '@/types/adminProduct'

export const AdminProductService = {
  async uploadImage(
    id: number,
    file: File,
    version: number,
    index?: number,
  ): Promise<AdminProduct> {
    const data = new FormData()
    data.append('file', file)
    const path = `/admin/products/${id}/images${index === undefined ? '' : `/${index}`}`
    return (await apiClient.post<AdminProduct>(path, data, { params: { version } })).data
  },
  async removeImage(id: number, index: number, version: number): Promise<AdminProduct> {
    return (
      await apiClient.delete<AdminProduct>(`/admin/products/${id}/images/${index}`, {
        params: { version },
      })
    ).data
  },
  async list(
    params: { q: string; categoryId?: number; visible?: boolean; page: number },
    signal?: AbortSignal,
  ): Promise<AdminProductPage> {
    return (await apiClient.get<AdminProductPage>('/admin/products', { params, signal })).data
  },
  async categories(signal?: AbortSignal): Promise<AdminCategory[]> {
    return (await apiClient.get<AdminCategory[]>('/admin/products/categories', { signal })).data
  },
  async get(id: number): Promise<AdminProduct> {
    return (await apiClient.get<AdminProduct>(`/admin/products/${id}`)).data
  },
  async create(payload: AdminProductPayload): Promise<AdminProduct> {
    return (await apiClient.post<AdminProduct>('/admin/products', payload)).data
  },
  async update(id: number, payload: AdminProductPayload): Promise<AdminProduct> {
    return (await apiClient.put<AdminProduct>(`/admin/products/${id}`, payload)).data
  },
  async inventory(id: number, stockQuantity: number, version: number): Promise<AdminProduct> {
    return (
      await apiClient.patch<AdminProduct>(`/admin/products/${id}/inventory`, {
        stockQuantity,
        version,
      })
    ).data
  },
  async visibility(id: number, visible: boolean, version: number): Promise<AdminProduct> {
    return (
      await apiClient.patch<AdminProduct>(`/admin/products/${id}/visibility`, { visible, version })
    ).data
  },
  async archive(id: number, version: number): Promise<AdminProduct> {
    return (await apiClient.delete<AdminProduct>(`/admin/products/${id}`, { params: { version } }))
      .data
  },
}
